import { z } from "zod";
import { generateObject } from "ai";
import { createLLMProvider } from "@/lib/llm";
import { getCredentials } from "@/ipc/ai-providers/ai-providers-client";

// Simple get function to avoid lodash dependency
function get(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return result;
}

const ScoreOutput = z.object({
  reason: z.string(),
  output: z.union([z.literal("yes"), z.literal("no")]),
});

/**
 * Uses an LLM call to classify if a substring is semantically contained in a text.
 * @param text1 The full text you want to check against
 * @param text2 The string you want to check if it is contained in the text
 * @param credentialId The credential ID for the LLM provider
 * @param model The model to use for evaluation
 */
async function semanticContains({
  text1,
  text2,
  credentialId,
  model,
}: {
  text1: string;
  text2: string;
  credentialId: string;
  model: string;
}): Promise<{ result: boolean; reason: string }> {
  const system = `
    You are a highly intelligent AI that can determine if a piece of text semantically contains another piece of text.
    You will be given two pieces of text and you need to determine if the first piece of text semantically contains the second piece of text.
    Answer with just "yes" or "no".
    `;

  const credentials = await getCredentials();
  const credential = credentials.find((c) => c.id === credentialId);

  if (!credential) {
    throw new Error("Credential not found");
  }

  const llmProvider = createLLMProvider(credential);

  const { object } = await generateObject({
    model: llmProvider(model),
    schema: ScoreOutput,
    system,
    prompt: `Text 1: ${text1}\n\nText 2: ${text2}\n\nDoes Text 1 semantically contain Text 2? Answer with just "yes" or "no".`,
  });

  return {
    result: object.output === "yes",
    reason: object.reason,
  };
}

/**
 * Uses an LLM to evaluate if specific criteria are met by a text
 * @param criteria The criteria to evaluate against
 * @param text The text to evaluate
 * @param credentialId The credential ID for the LLM provider
 * @param model The model to use for evaluation
 */
async function llmCriteriaMet({
  criteria,
  text,
  credentialId,
  model,
}: {
  criteria: string;
  text: string;
  credentialId: string;
  model: string;
}): Promise<{ result: boolean; reason: string }> {
  const system = `
    You are a highly intelligent AI tasked with determining if text meets specific criteria.
    Answer with just "yes" or "no".
    `;

  const credentials = await getCredentials();
  const credential = credentials.find((c) => c.id === credentialId);

  if (!credential) {
    throw new Error("Credential not found");
  }

  const llmProvider = createLLMProvider(credential);

  const { object } = await generateObject({
    model: llmProvider(model),
    schema: ScoreOutput,
    system,
    prompt: `Criteria: ${criteria}\n\nText: ${text}\n\nDoes the text meet the criteria? Answer with just "yes" or "no".`,
  });

  return {
    result: object.output === "yes",
    reason: object.reason,
  };
}

type AssertionTypes =
  | "equals"
  | "exists"
  | "not_exists"
  | "llm_criteria_met"
  | "semantic_contains"
  | "tool_called";

export interface Assertion {
  path: string;
  assertionType: AssertionTypes;
  value?: string;
}

export interface AssertionResult {
  assertion: Assertion;
  passed: boolean;
  reason?: string;
  actualValue?: unknown;
  expectedValue?: string;
}

export interface EvaluationResult {
  itemId: string;
  itemName: string;
  passed: boolean;
  assertions: AssertionResult[];
  executionTime: number;
  error?: string;
}

export const AssertionScorer = async ({
  output,
  assertions,
  credentialId,
  model,
}: {
  output: unknown;
  assertions: Assertion[];
  credentialId: string;
  model: string;
}): Promise<AssertionResult[]> => {
  // Run all assertions in parallel and collect promises
  const assertionPromises = assertions.map(
    async (assertion): Promise<AssertionResult> => {
      const { assertionType, path, value } = assertion;
      const actualValue = get(output, path);

      try {
        switch (assertionType) {
          case "equals":
            return {
              assertion,
              passed: actualValue === value,
              actualValue,
              expectedValue: value,
            };

          case "exists":
            return {
              assertion,
              passed: actualValue !== undefined && actualValue !== null,
              actualValue,
            };

          case "not_exists":
            return {
              assertion,
              passed: actualValue === undefined || actualValue === null,
              actualValue,
            };

          case "llm_criteria_met": {
            if (!value) {
              throw new Error(
                "Value is required for llm_criteria_met assertion",
              );
            }
            const criteriaResult = await llmCriteriaMet({
              criteria: value,
              text: String(actualValue || ""),
              credentialId,
              model,
            });
            return {
              assertion,
              passed: criteriaResult.result,
              reason: criteriaResult.reason,
              actualValue,
              expectedValue: value,
            };
          }

          case "semantic_contains": {
            if (!value) {
              throw new Error(
                "Value is required for semantic_contains assertion",
              );
            }
            const semanticResult = await semanticContains({
              text1: String(actualValue || ""),
              text2: value,
              credentialId,
              model,
            });
            return {
              assertion,
              passed: semanticResult.result,
              reason: semanticResult.reason,
              actualValue,
              expectedValue: value,
            };
          }

          case "tool_called":
            // Check if a tool with the specified name was called
            if (Array.isArray(output) && output.length > 0) {
              // Look for tool calls in the output messages
              const toolCalled = output.some((item: unknown) => {
                if (item && typeof item === "object" && "parts" in item) {
                  const parts = (item as { parts: unknown[] }).parts;
                  return (
                    Array.isArray(parts) &&
                    parts.some(
                      (part: unknown) =>
                        part &&
                        typeof part === "object" &&
                        "type" in part &&
                        part.type === "tool-invocation" &&
                        "toolInvocation" in part &&
                        part.toolInvocation &&
                        typeof part.toolInvocation === "object" &&
                        "toolName" in part.toolInvocation &&
                        (part.toolInvocation as { toolName: unknown })
                          .toolName === value,
                    )
                  );
                }
                return false;
              });
              return {
                assertion,
                passed: toolCalled,
                actualValue: output,
                expectedValue: value,
              };
            }
            return {
              assertion,
              passed: false,
              actualValue: output,
              expectedValue: value,
            };

          default:
            assertionType satisfies never;
            throw new Error(`Unknown assertion type: ${assertionType}`);
        }
      } catch (error) {
        return {
          assertion,
          passed: false,
          reason: error instanceof Error ? error.message : "Unknown error",
          actualValue,
          expectedValue: value,
        };
      }
    },
  );

  const assertionResults = await Promise.all(assertionPromises);
  return assertionResults;
};
