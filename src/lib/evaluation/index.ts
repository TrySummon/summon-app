import { z } from "zod";
import { generateObject, UIMessage } from "ai";
import { createLLMProvider } from "@/lib/llm";
import { getCredentials } from "@/ipc/ai-providers/ai-providers-client";

const ScoreOutput = z.object({
  reason: z.string(),
  output: z.union([z.literal("yes"), z.literal("no")]),
});

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

type AssertionTypes = "llm_criteria_met" | "tool_called";

export interface Assertion {
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
  output: UIMessage[];
  assertions: Assertion[];
  credentialId: string;
  model: string;
}): Promise<AssertionResult[]> => {
  // Run all assertions in parallel and collect promises
  const assertionPromises = assertions.map(
    async (assertion): Promise<AssertionResult> => {
      const { assertionType, value } = assertion;
      const actualValue = JSON.stringify(output, null, 2);

      try {
        switch (assertionType) {
          case "llm_criteria_met": {
            if (!value) {
              throw new Error(
                "Value is required for llm_criteria_met assertion",
              );
            }
            const criteriaResult = await llmCriteriaMet({
              criteria: value,
              text: actualValue,
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

          case "tool_called": {
            // Look for tool calls in the output messages
            const toolCalled = output.some((item) => {
              return item.parts.some(
                (part) =>
                  part.type === "tool-invocation" &&
                  part.toolInvocation &&
                  part.toolInvocation.toolName === value,
              );
            });
            return {
              assertion,
              passed: toolCalled,
              actualValue: output,
              expectedValue: value,
            };
          }

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
