import { streamObject } from "ai";
import { z } from "zod";
import { createLLMProvider } from "@/lib/llm";
import { getCredentials } from "@/ipc/ai-providers/ai-providers-client";
import { UIMessage } from "ai";

// Schema for basic info (name and description)
const basicInfoSchema = z.object({
  name: z
    .string()
    .describe(
      "A clear, descriptive name for this test case or dataset item that explains what the conversation demonstrates",
    ),
  description: z
    .string()
    .describe(
      "A concise and straight to the point description of what this conversation tests, demonstrates, or accomplishes.",
    ),
});

// Schema for criteria generation
const criteriaSchema = z.object({
  criteria: z
    .array(z.string())
    .describe(
      "Natural language success criteria for when this conversation runs in CI. Each criterion should describe expected outputs, behaviors, or quality measures. Examples: 'The response should contain specific technical details', 'The assistant should ask for clarification when needed', 'Tool calls should be made accurately'. Generate 3-5 criteria.",
    ),
});

export type BasicInfoContent = z.infer<typeof basicInfoSchema>;
export type CriteriaContent = z.infer<typeof criteriaSchema>;

// Type for partial content that handles the streaming nature
export interface PartialBasicInfoContent {
  name?: string;
  description?: string;
}

export interface PartialCriteriaContent {
  criteria?: (string | undefined)[];
}

export interface PrefillOptions {
  model?: string;
  credentialId?: string;
  messages: UIMessage[];
  cutPosition: number;
}

export interface BasicInfoGenerationState {
  isGenerating: boolean;
  content: PartialBasicInfoContent;
  error?: string;
}

export interface CriteriaGenerationState {
  isGenerating: boolean;
  content: PartialCriteriaContent;
  error?: string;
}

/**
 * Generates basic info (name and description) for the CutModeDialog
 */
export async function generateBasicInfo(
  options: PrefillOptions,
  onUpdate: (state: BasicInfoGenerationState) => void,
  abortSignal?: AbortSignal,
): Promise<BasicInfoContent> {
  const { model, credentialId, messages, cutPosition } = options;

  if (!model || !credentialId) {
    throw new Error("Model and credential ID are required");
  }

  // Get credentials
  const credentials = await getCredentials();
  const credential = credentials.find((c) => c.id === credentialId);

  if (!credential) {
    throw new Error("Credential not found");
  }

  const llmProvider = createLLMProvider(credential);

  // Create a context summary of the conversation
  const contextMessages = messages.slice(0, cutPosition);
  const conversationContext = createConversationContext(contextMessages);

  const prompt = `Analyze this conversation and generate a clear name and description for creating a test case or dataset item.

Conversation context:
${conversationContext}

Please generate:
1. A clear, descriptive name that explains what this conversation demonstrates (keep it concise but informative)
2. A concise and straight to the point description of what this conversation tests or accomplishes

Focus on the main topic, tools used, problem-solving approach, and what makes this conversation valuable as a test case.`;

  // Initialize state
  onUpdate({
    isGenerating: true,
    content: {},
  });

  try {
    const { partialObjectStream, object } = streamObject({
      model: llmProvider(model),
      schema: basicInfoSchema,
      prompt,
      abortSignal,
    });

    // Stream updates
    for await (const partialObject of partialObjectStream) {
      onUpdate({
        isGenerating: true,
        content: partialObject as PartialBasicInfoContent,
      });
    }

    // Get final result
    const finalObject = await object;

    onUpdate({
      isGenerating: false,
      content: finalObject,
    });

    return finalObject;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate content";

    onUpdate({
      isGenerating: false,
      content: {},
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Generates test criteria for the CutModeDialog
 */
export async function generateCriteria(
  options: PrefillOptions,
  onUpdate: (state: CriteriaGenerationState) => void,
  abortSignal?: AbortSignal,
): Promise<CriteriaContent> {
  const { model, credentialId, messages, cutPosition } = options;

  if (!model || !credentialId) {
    throw new Error("Model and credential ID are required");
  }

  // Check if there are messages after the cut position
  const outputMessages = messages.slice(cutPosition);
  if (outputMessages.length === 0) {
    // No messages after the cut, return instantly with empty criteria
    const emptyCriteria: CriteriaContent = { criteria: [] };
    onUpdate({
      isGenerating: false,
      content: emptyCriteria,
    });
    return emptyCriteria;
  }

  // Get credentials
  const credentials = await getCredentials();
  const credential = credentials.find((c) => c.id === credentialId);

  if (!credential) {
    throw new Error("Credential not found");
  }

  const llmProvider = createLLMProvider(credential);

  // Create a context summary of the conversation
  const inputMessages = messages.slice(0, cutPosition);
  const inputContext = createConversationContext(inputMessages);
  const outputContext = createConversationContext(outputMessages);

  const prompt = `Analyze this conversation and generate success criteria for automated testing when this conversation runs in CI. Focus on whether the core task was successfully solved.

  Input context (messages before the cut):
  ${inputContext}
  
  Expected output context (messages after the cut):
  ${outputContext}
  
  Based on the expected output, generate 1-2 natural language success criteria that describe whether the task was completed successfully. Each criterion should be specific and testable, focusing on the core problem-solving outcomes rather than conversational details.
  
  Ignore tool calls and function invocations - these are validated in a separate process. Focus only on the final outputs and task completion.
  
  Examples:
  - "The response should provide a working solution that addresses the technical requirements"
  - "The output should contain the requested data analysis with accurate calculations"
  - "The generated code should implement the specified functionality correctly"
  
  Focus on the essential task completion indicators that determine whether the assistant successfully solved the user's problem.`;

  onUpdate({
    isGenerating: true,
    content: {},
  });

  try {
    const { partialObjectStream, object } = streamObject({
      model: llmProvider(model),
      schema: criteriaSchema,
      prompt,
      abortSignal,
    });

    // Stream updates
    for await (const partialObject of partialObjectStream) {
      onUpdate({
        isGenerating: true,
        content: partialObject as PartialCriteriaContent,
      });
    }

    // Get final result
    const finalObject = await object;

    onUpdate({
      isGenerating: false,
      content: finalObject,
    });

    return finalObject;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate criteria";

    onUpdate({
      isGenerating: false,
      content: {},
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Creates a conversation context summary from messages
 */
function createConversationContext(messages: UIMessage[]): string {
  const parts: string[] = [];

  messages.forEach((message) => {
    if (message.role === "user") {
      const content = extractTextContent(message);
      if (content.trim()) {
        parts.push(`User: ${content}`);
      }
    } else if (message.role === "assistant") {
      const content = extractTextContent(message);
      if (content.trim()) {
        parts.push(`Assistant: ${content}`);
      }

      // Add tool calls if any
      const toolCalls = extractToolCalls(message);
      if (toolCalls.length > 0) {
        parts.push(`Tools used: ${toolCalls.join(", ")}`);
      }
    }
  });

  return parts.join("\n\n");
}

/**
 * Extracts text content from a message
 */
function extractTextContent(message: UIMessage): string {
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part as { text: string }).text || "")
      .join(" ");
  }

  return "";
}

/**
 * Extracts tool call names from a message
 */
function extractToolCalls(message: UIMessage): string[] {
  if (!Array.isArray(message.parts)) {
    return [];
  }

  return message.parts
    .filter((part) => part.type === "tool-invocation")
    .map((part) => {
      const toolInvocation = (
        part as { toolInvocation?: { toolName?: string } }
      ).toolInvocation;
      return toolInvocation?.toolName || "";
    })
    .filter(Boolean);
}
