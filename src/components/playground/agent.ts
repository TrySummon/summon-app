import { CoreSystemMessage, jsonSchema, streamText, ToolSet } from "ai";
import { createLLMProvider } from "@/helpers/llm";
import { usePlaygroundStore, type PlaygroundStore } from "./store";
import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";
import type { JSONSchema7 } from "json-schema";

/**
 * Remaps modified tool arguments back to their original names for API compatibility.
 * Handles both tool name changes and deep property name changes using x-original-name metadata.
 */
function remapArgsToOriginal(
  modifiedArgs: Record<string, unknown>,
  originalSchema: JSONSchema7,
  modifiedSchema: JSONSchema7,
): Record<string, unknown> {
  if (!modifiedArgs || typeof modifiedArgs !== "object") {
    return modifiedArgs;
  }

  const remappedArgs: Record<string, unknown> = {};

  // Get properties from both schemas
  const originalProps = originalSchema.properties || {};
  const modifiedProps = modifiedSchema.properties || {};

  // Process each argument in the modified args
  for (const [modifiedPropName, value] of Object.entries(modifiedArgs)) {
    const modifiedPropSchema = modifiedProps[
      modifiedPropName
    ] as JSONSchema7 & { "x-original-name"?: string };

    if (!modifiedPropSchema) {
      // Property doesn't exist in modified schema, skip it
      continue;
    }

    // Get the original property name (check for x-original-name metadata)
    const originalPropName =
      modifiedPropSchema["x-original-name"] || modifiedPropName;
    const originalPropSchema = originalProps[originalPropName] as JSONSchema7;

    if (!originalPropSchema) {
      // Original property doesn't exist, skip it
      continue;
    }

    // Handle nested objects recursively
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (
        modifiedPropSchema.type === "object" &&
        originalPropSchema.type === "object"
      ) {
        // Recursively remap nested object properties
        remappedArgs[originalPropName] = remapArgsToOriginal(
          value as Record<string, unknown>,
          originalPropSchema,
          modifiedPropSchema,
        );
      } else {
        // Not an object type, use value as-is
        remappedArgs[originalPropName] = value;
      }
    } else if (Array.isArray(value)) {
      // Handle arrays - check if array items are objects that need remapping
      if (
        modifiedPropSchema.type === "array" &&
        originalPropSchema.type === "array"
      ) {
        const modifiedItemSchema = modifiedPropSchema.items as JSONSchema7;
        const originalItemSchema = originalPropSchema.items as JSONSchema7;

        if (
          modifiedItemSchema &&
          originalItemSchema &&
          modifiedItemSchema.type === "object" &&
          originalItemSchema.type === "object"
        ) {
          // Recursively remap each object in the array
          remappedArgs[originalPropName] = value.map((item) => {
            if (item && typeof item === "object") {
              return remapArgsToOriginal(
                item,
                originalItemSchema,
                modifiedItemSchema,
              );
            }
            return item;
          });
        } else {
          // Array of primitives or non-object items, use as-is
          remappedArgs[originalPropName] = value;
        }
      } else {
        remappedArgs[originalPropName] = value;
      }
    } else {
      // Primitive value, use as-is with original property name
      remappedArgs[originalPropName] = value;
    }
  }

  return remappedArgs;
}

export async function runAgent() {
  // Track start time for latency calculation
  const startTime = Date.now();
  // Track token usage if available from API response
  const tokenUsageData = {
    inputTokens: 0,
    outputTokens: 0,
  };

  const store = usePlaygroundStore.getState();

  try {
    const {
      aiToolMap,
      updateCurrentState,
      updateMessage,
      getCurrentState,
      updateShouldScrollToDock,
    } = store;
    const { messages, systemPrompt, model, settings, maxSteps } =
      getCurrentState();

    // Create a new AbortController for this run
    const abortController = new AbortController();
    updateCurrentState((state) => ({
      ...state,
      tokenUsage: undefined,
      abortController,
    }));
    const abortSignal = abortController.signal;

    // Set shouldScrollToDock to true when agent starts running
    updateShouldScrollToDock(true);

    updateCurrentState((state) => ({
      ...state,
      running: true,
      latency: undefined,
      tokenUsage: undefined,
    }));

    // Get the current state to access enabledTools and modifiedToolMap
    const currentState = getCurrentState();
    const enabledTools = currentState.enabledTools || {};
    const modifiedToolMap = currentState.modifiedToolMap || {};

    // Create a filtered toolset based on selected tools
    const toolSet: ToolSet = {};

    // Iterate through each MCP's tools
    Object.entries(aiToolMap).forEach(([mcpId, tools]) => {
      // Get the list of enabled tool IDs for this MCP
      const enabledToolIds = enabledTools[mcpId] || [];

      // Only add tools that are enabled
      Object.entries(tools).forEach(([toolName, tool]) => {
        // Check if this tool is enabled for this MCP
        if (enabledToolIds.includes(toolName)) {
          // Check if there are modifications for this tool
          const modification = modifiedToolMap[mcpId]?.[toolName];

          if (modification) {
            // Apply modifications to the tool but keep the original name
            // Override the execute function to handle name remapping if needed
            const modifiedTool = {
              ...tool,
              parameters: jsonSchema(modification.schema),
              execute: (args: Record<string, unknown>) => {
                // Remap modified args back to original args
                const remappedArgs = remapArgsToOriginal(
                  args,
                  tool.parameters.jsonSchema,
                  modification.schema,
                );
                // Always call with the original tool name for API compatibility
                return window.mcpApi.callMcpTool(mcpId, toolName, remappedArgs);
              },
            };

            // Use modified name if provided, otherwise use original name
            const finalToolName = modification.name || toolName;
            toolSet[finalToolName] = modifiedTool;
          } else {
            // Use original tool without modifications
            toolSet[toolName] = tool;
          }
        }
      });
    });

    if (!model) {
      throw new Error("Model not set");
    }

    const systemPromptMessage: CoreSystemMessage | undefined = systemPrompt
      ?.trim()
      .replace(/^\n+|\n+$/g, "")
      ? {
          role: "system",
          content: systemPrompt,
        }
      : undefined;

    const credentials = await window.aiProviders.getCredentials();
    const credential = credentials.find(
      (c) => c.id === currentState.credentialId,
    );

    if (!credential) {
      throw new Error("Credential not found");
    }
    const llmProvider = createLLMProvider(credential);

    // We'll create the assistant message only when we receive the first token
    let assistantMessageId = uuidv4();
    let assistantMessageCreated = false;

    let fullResponse = "";

    // Stream the response

    const { textStream } = streamText({
      model: llmProvider(model),
      tools: toolSet,
      messages: systemPromptMessage
        ? [systemPromptMessage, ...messages]
        : messages,
      maxSteps,
      abortSignal,
      onStepFinish: (step) => {
        // Capture token usage when the step finishes with 'stop' reason
        if (step.finishReason === "stop" && step.usage) {
          // Update token usage data
          tokenUsageData.inputTokens = step.usage.promptTokens || 0;
          tokenUsageData.outputTokens = step.usage.completionTokens || 0;

          // Update token usage in state
          updateCurrentState(
            (state) => ({
              ...state,
              tokenUsage: {
                inputTokens: tokenUsageData.inputTokens,
                outputTokens: tokenUsageData.outputTokens,
              },
            }),
            true,
            "Add assistant response",
          );
        }

        if (step.finishReason === "tool-calls") {
          assistantMessageId = uuidv4();
          assistantMessageCreated = false;
          fullResponse = "";

          const toolMessages: UIMessage[] = [];
          step.toolCalls.forEach((toolCall, i) => {
            const toolMessage: UIMessage = {
              id: toolCall.toolCallId,
              role: "data",
              content: "",
              parts: [
                {
                  type: "tool-invocation",
                  toolInvocation: {
                    state: "result",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    result: (
                      step.toolResults[i] as unknown as { result: unknown }
                    ).result,
                  },
                },
              ],
              createdAt: new Date(),
            };
            toolMessages.push(toolMessage);
          });
          updateCurrentState(
            (state) => ({
              ...state,
              messages: [...state.messages, ...toolMessages],
            }),
            true,
            "Add tool messages",
          );
        }
      },
      onError: (error) => {
        handleAgentError(error.error, store);
      },
      ...settings,
    });

    // Process each chunk of the stream
    for await (const textPart of textStream) {
      fullResponse += textPart;

      // Calculate latency (ongoing)
      const currentLatency = Date.now() - startTime;

      // Create the assistant message on first token if it doesn't exist yet
      if (!assistantMessageCreated) {
        const initialAssistantMessage: UIMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          parts: [{ type: "text", text: fullResponse }],
          createdAt: new Date(),
        };

        updateCurrentState((state) => ({
          ...state,
          latency: currentLatency,
          messages: [...state.messages, initialAssistantMessage],
        }));

        assistantMessageCreated = true;
      } else {
        // Update the assistant message with the accumulated text
        const messageIndex = getCurrentState().messages.findIndex(
          (msg) => msg.id === assistantMessageId,
        );

        if (messageIndex !== -1) {
          const updatedAssistantMessage: UIMessage = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            parts: [{ type: "text", text: fullResponse }],
            createdAt: new Date(),
          };

          updateMessage(messageIndex, updatedAssistantMessage);
          // Update latency in state
          updateCurrentState(
            (state) => ({
              ...state,
              latency: currentLatency,
            }),
            false,
          );
        }
      }
    }
  } catch (error) {
    handleAgentError(error, store);
  } finally {
    // Calculate final latency
    const endTime = Date.now();
    const finalLatency = endTime - startTime;

    // Update the state with the final latency and any token usage information
    store.updateCurrentState((state) => {
      // Reset the running state and abort controller
      return {
        ...state,
        running: false,
        abortController: undefined,
        latency: finalLatency,
        tokenUsage: tokenUsageData,
      };
    }, false);
  }
}

/**
 * Handles errors that occur during agent execution
 * @param error The error that occurred
 * @param store The playground store instance
 */
function handleAgentError(error: unknown, store: PlaygroundStore) {
  console.error(error);
  // Add an error message to the chat
  const errorMessage: UIMessage = {
    id: uuidv4(),
    role: "assistant",
    content: "",
    parts: [
      {
        type: "text",
        text: `Sorry, there was an error generating a response:\n\`\`\`\n${String(error)}\n\`\`\``,
      },
    ],
    createdAt: new Date(),
  };

  store.updateCurrentState((state) => ({
    ...state,
    running: false,
    messages: [...state.messages, errorMessage],
  }));
}
