import {
  CoreSystemMessage,
  jsonSchema,
  streamText,
  generateText,
  ToolSet,
  tool as makeTool,
} from "ai";
import { createLLMProvider } from "@/lib/llm";
import {
  ToolMap,
  usePlaygroundStore,
  type PlaygroundStore,
} from "@/stores/playgroundStore";
import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";
import type { JSONSchema7 } from "json-schema";
import { captureEvent } from "@/lib/posthog";
import { getCredentials } from "@/ipc/ai-providers/ai-providers-client";
import { callMcpTool } from "@/ipc/mcp/mcp-client";
import { LLMSettings } from "@/stores/types";
import { ToolDefinition } from "./mcp/tool";

export function makeExecuteFunction(
  mcpToolMap: ToolMap,
  mcpId: string,
  toolName: string,
) {
  return (args: unknown) => {
    const mcp = mcpToolMap[mcpId];
    if (!mcp) {
      throw new Error(`MCP ${mcpId} not found`);
    }

    const tool = mcp.tools.find((tool) => tool.name === toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found for MCP ${mcpId}`);
    }

    const originalDefinition = tool.isExternal
      ? (tool.annotations?.originalDefinition as ToolDefinition)
      : null;
    const originalName = originalDefinition
      ? originalDefinition.name
      : tool.name;

    // Always call with the original tool name for API compatibility
    return callMcpTool(mcpId, originalName, args as Record<string, unknown>);
  };
}

export async function runPlaygroundAgent() {
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

    // Get the current state to access enabledTools
    const currentState = getCurrentState();
    const autoExecuteTools = currentState.autoExecuteTools;
    const enabledTools = currentState.enabledTools || {};

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
          const aiTool = makeTool({
            description: mcpTool.description,
            parameters: jsonSchema(
              mcpTool.inputSchema as unknown as JSONSchema7,
            ),
            // @ts-expect-error AI SDK typing issue.
            execute: autoExecuteTools
              ? makeExecuteFunction(mcpToolMap, mcpId, mcpTool.name)
              : undefined,
          });

          toolSet[mcpTool.name] = aiTool;
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

          store.updateMessageWithLatency(
            messageIndex,
            updatedAssistantMessage,
            currentLatency,
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
 * Finds the original MCP ID from a tool name.
 */
export function findToolMcpId(toolName: string): string | null {
  const store = usePlaygroundStore.getState();
  const { mcpToolMap } = store;

  // If not found in modifications, check if it's an original tool name
  for (const [mcpId, mcp] of Object.entries(mcpToolMap)) {
    for (const tool of mcp.tools) {
      if (tool.name === toolName) {
        return mcpId;
      }
    }
  }

  return null;
}

export interface RunLocalAgentConfig {
  messages: UIMessage[];
  systemPrompt?: string;
  credentialId: string;
  model: string;
  settings?: LLMSettings;
  maxSteps?: number;
  enabledTools?: Record<string, string[]>;
  mcpToolMap: ToolMap;
}

/**
 * Standalone agent runner that doesn't depend on playground store.
 * Used for evaluations and other scenarios where we need to run the agent
 * with specific configuration without affecting the UI state.
 */
export async function runLocalAgent(
  config: RunLocalAgentConfig,
): Promise<UIMessage[]> {
  const {
    messages,
    systemPrompt,
    credentialId,
    model,
    settings = { temperature: 0, maxTokens: 4096 },
    maxSteps = 5,
    enabledTools = {},
    mcpToolMap,
  } = config;

  try {
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

          const aiTool = makeTool({
            description: mcpTool.description,
            parameters: jsonSchema(
              mcpTool.inputSchema as unknown as JSONSchema7,
            ),
            // Always auto-execute tools in standalone mode
            execute: makeExecuteFunction(mcpToolMap, mcpId, mcpTool.name),
          });

          toolSet[mcpTool.name] = aiTool;
        }
      });
    });

    const systemPromptMessage: CoreSystemMessage | undefined = systemPrompt
      ?.trim()
      .replace(/^\n+|\n+$/g, "")
      ? {
          role: "system",
          content: systemPrompt,
        }
      : undefined;

    const credentials = await getCredentials();
    const credential = credentials.find((c) => c.id === credentialId);

    if (!credential) {
      throw new Error("Credential not found");
    }
    const llmProvider = createLLMProvider(credential);

    // Use generateText instead of streamText for better performance in evaluation
    const result = await generateText({
      model: llmProvider(model),
      tools: toolSet,
      messages: systemPromptMessage
        ? [systemPromptMessage, ...messages]
        : messages,
      maxSteps,
      ...settings,
    });

    // Convert the result to UIMessage format
    const outputMessages: UIMessage[] = [...messages];

    // Add tool call messages
    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolCalls && step.toolCalls.length > 0) {
          const toolMessages: UIMessage[] = step.toolCalls.map(
            (toolCall, i) => {
              const toolResult = step.toolResults?.[i];

              return {
                id: toolCall.toolCallId,
                role: "assistant" as const,
                content: "",
                parts: [
                  {
                    type: "tool-invocation",
                    toolInvocation: {
                      state: toolResult ? "result" : "partial-call",
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      args: toolCall.args,
                      result: toolResult
                        ? (toolResult as unknown as { result: unknown }).result
                        : undefined,
                    },
                  },
                ],
                createdAt: new Date(),
              };
            },
          );
          outputMessages.push(...toolMessages);
        }
      }
    }

    // Add the final assistant message if there's content
    if (result.text && result.text.trim()) {
      const finalAssistantMessage: UIMessage = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        parts: [{ type: "text", text: result.text }],
        createdAt: new Date(),
      };
      outputMessages.push(finalAssistantMessage);
    }

    return outputMessages;
  } catch (error) {
    // Add error message to the conversation
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

    return [...messages, errorMessage];
  }
}
