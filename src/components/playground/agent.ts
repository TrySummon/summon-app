import {
  CoreSystemMessage,
  jsonSchema,
  streamText,
  ToolSet,
  tool as makeTool,
} from "ai";
import { createLLMProvider } from "@/helpers/llm";
import { usePlaygroundStore, type PlaygroundStore } from "./store";
import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";
import type { JSONSchema7 } from "json-schema";
import { captureEvent } from "@/helpers/posthog";
import { recurseCountKeys } from "@/helpers/object";
import { getCredentials } from "@/helpers/ipc/ai-providers/ai-providers-client";
import { callMcpTool } from "@/helpers/ipc/mcp/mcp-client";
/**
 * Remaps modified tool arguments back to their original names for API compatibility.
 * Handles both tool name changes and deep property name changes using x-original-name metadata.
 */
export function remapArgsToOriginal(
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

export function makeExecuteFunction(mcpId: string, toolName: string) {
  return (args: unknown) => {
    const store = usePlaygroundStore.getState();

    const mcp = store.mcpToolMap[mcpId];
    const tool = mcp.tools.find((tool) => tool.name === toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found for MCP ${mcpId}`);
    }

    const currentState = store.getCurrentState();

    const modification = currentState.modifiedToolMap[mcpId]?.[toolName];

    if (modification) {
      // Remap modified args back to original args
      args = remapArgsToOriginal(
        args as Record<string, unknown>,
        tool.inputSchema as unknown as JSONSchema7,
        modification.schema,
      );

      // Track tool call event
      captureEvent("playground_ai_agent_tool_remap_args", {
        argsCount: Object.keys(args as Record<string, unknown>).length,
        argsKeyCount: recurseCountKeys(args as Record<string, unknown>),
      });
    }

    // Always call with the original tool name for API compatibility
    return callMcpTool(mcpId, tool.name, args as Record<string, unknown>);
  };
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
      mcpToolMap,
      updateCurrentState,
      updateMessage,
      getCurrentState,
      updateShouldScrollToDock,
    } = store;
    const { messages, systemPrompt, model, settings, maxSteps } =
      getCurrentState();

    // Track AI agent start
    captureEvent("playground_ai_agent_start", {
      model: model,
      conversation_length: messages.length,
      max_steps: maxSteps,
      mcp_count: Object.keys(mcpToolMap).length,
      tool_count: Object.values(mcpToolMap).reduce(
        (acc, tools) => acc + Object.keys(tools).length,
        0,
      ),
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    });

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
    const autoExecuteTools = currentState.autoExecuteTools;
    const enabledTools = currentState.enabledTools || {};
    const modifiedToolMap = currentState.modifiedToolMap || {};

    // Create a filtered toolset based on selected tools
    const toolSet: ToolSet = {};

    // Iterate through each MCP's tools
    Object.entries(mcpToolMap).forEach(([mcpId, mcp]) => {
      // Get the list of enabled tool IDs for this MCP
      const enabledToolIds = enabledTools[mcpId] || [];

      // Only add tools that are enabled
      mcp.tools.forEach((mcpTool) => {
        // Check if this tool is enabled for this MCP
        if (enabledToolIds.includes(mcpTool.name)) {
          // Check if there are modifications for this tool
          const modification = modifiedToolMap[mcpId]?.[mcpTool.name];

          const finalName = modification?.name || mcpTool.name;
          const finalDescription =
            modification?.description || mcpTool.description;
          const finalParameters = modification?.schema
            ? jsonSchema(modification.schema)
            : jsonSchema(mcpTool.inputSchema as unknown as JSONSchema7);

          const aiTool = makeTool({
            description: finalDescription,
            parameters: finalParameters,
            // @ts-expect-error AI SDK typing issue.
            execute: autoExecuteTools
              ? makeExecuteFunction(mcpId, mcpTool.name)
              : undefined,
          });

          toolSet[finalName] = aiTool;
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

    const credentials = await getCredentials();
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
            const result = step.toolResults[i]
              ? (step.toolResults[i] as unknown as { result: unknown }).result
              : undefined;

            const toolMessage: UIMessage = {
              id: toolCall.toolCallId,
              role: "assistant",
              content: "",
              parts: [
                {
                  type: "tool-invocation",
                  toolInvocation: {
                    state: result ? "result" : "partial-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    args: toolCall.args,
                    result: result,
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

    const currentState = store.getCurrentState();
    const { messages } = currentState;

    // Track AI agent completion
    captureEvent("playground_ai_agent_completed", {
      conversation_length: messages.length,
    });
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
  const currentState = store.getCurrentState();
  const { messages } = currentState;
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
    messages: [...messages, errorMessage],
  }));

  // Track AI agent error
  captureEvent("playground_ai_agent_error", {
    conversation_length: messages.length,
  });
}

/**
 * Finds the original tool name and MCP ID from a potentially modified tool name.
 * This function searches through the current tool modifications to find the original tool.
 */
export function findOriginalToolInfo(modifiedToolName: string): {
  mcpId: string;
  originalToolName: string;
} | null {
  const store = usePlaygroundStore.getState();
  const { mcpToolMap, getCurrentState } = store;
  const { modifiedToolMap } = getCurrentState();

  // First, check if this is a modified tool name
  for (const [mcpId, mcpModifications] of Object.entries(modifiedToolMap)) {
    for (const [originalToolName, modification] of Object.entries(
      mcpModifications,
    )) {
      if (modification.name === modifiedToolName) {
        return { mcpId, originalToolName };
      }
    }
  }

  // If not found in modifications, check if it's an original tool name
  for (const [mcpId, mcp] of Object.entries(mcpToolMap)) {
    for (const tool of mcp.tools) {
      if (tool.name === modifiedToolName) {
        return { mcpId, originalToolName: tool.name };
      }
    }
  }

  return null;
}
