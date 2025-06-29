import { DatasetItem } from "@/types/dataset";
import { UIMessage } from "ai";
import { runLocalAgent, RunLocalAgentConfig } from "@/lib/agent";
import { AssertionScorer, Assertion, EvaluationResult } from "./index";
import { ToolMap } from "@/stores/playgroundStore";

export interface EvaluationConfig {
  agentCredentialId: string;
  agentModel: string;
  assertionCredentialId: string;
  assertionModel: string;
  maxSteps?: number;
  enabledTools?: Record<string, string[]>;
  mcpToolMap: ToolMap;
}

export interface EvaluationSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: EvaluationResult[];
}

/**
 * Converts a dataset item into assertions for evaluation
 */
function createAssertionsFromDatasetItem(item: DatasetItem): Assertion[] {
  const assertions: Assertion[] = [];

  // Add assertions for natural language criteria
  if (item.naturalLanguageCriteria) {
    item.naturalLanguageCriteria.forEach((criteria) => {
      assertions.push({
        assertionType: "llm_criteria_met",
        value: criteria,
      });
    });
  }

  // Add assertions for expected tool calls
  if (item.expectedToolCalls) {
    item.expectedToolCalls.forEach((toolName) => {
      assertions.push({
        assertionType: "tool_called",
        value: toolName,
      });
    });
  }

  return assertions;
}

/**
 * Prepares the input messages for the agent based on the dataset item
 */
function prepareInputMessages(item: DatasetItem): UIMessage[] {
  const cutPosition = item.inputOutputCutPosition;

  if (cutPosition === undefined || cutPosition === null) {
    // No cut position specified, use all messages as input
    return item.messages;
  }

  // Return messages up to the cut position
  return item.messages.slice(0, cutPosition);
}

/**
 * Runs evaluation for a single dataset item
 */
async function evaluateDatasetItem(
  item: DatasetItem,
  config: EvaluationConfig,
): Promise<EvaluationResult> {
  const startTime = Date.now();

  try {
    // Create assertions from dataset item expectations
    const assertions = createAssertionsFromDatasetItem(item);

    if (assertions.length === 0) {
      return {
        itemId: item.id,
        itemName: item.name,
        passed: true,
        assertions: [],
        executionTime: Date.now() - startTime,
        error: "No assertions to evaluate (no criteria or expected tool calls)",
      };
    }

    // Prepare input messages
    const inputMessages = prepareInputMessages(item);

    // Configure the agent run
    const agentConfig: RunLocalAgentConfig = {
      messages: inputMessages,
      systemPrompt: item.systemPrompt || "",
      credentialId: config.agentCredentialId,
      model: config.agentModel,
      settings: item.settings,
      maxSteps: config.maxSteps || 5,
      enabledTools: config.enabledTools || {},
      mcpToolMap: config.mcpToolMap,
    };

    // Run the agent
    const outputMessages = await runLocalAgent(agentConfig);

    // Run assertions against the output
    const assertionResults = await AssertionScorer({
      output: outputMessages,
      assertions,
      credentialId: config.assertionCredentialId,
      model: config.assertionModel,
    });

    const passed = assertionResults.every((result) => result.passed);

    return {
      itemId: item.id,
      itemName: item.name,
      passed,
      assertions: assertionResults,
      executionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      itemId: item.id,
      itemName: item.name,
      passed: false,
      assertions: [],
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Runs evaluation for multiple dataset items
 */
export async function runEvaluation(
  items: DatasetItem[],
  config: EvaluationConfig,
  onProgress?: (progress: {
    completed: number;
    total: number;
    currentItem: string;
  }) => void,
): Promise<EvaluationSummary> {
  const startTime = Date.now();

  // Filter items that have evaluation criteria
  const evaluableItems = items.filter(
    (item) =>
      (item.naturalLanguageCriteria &&
        item.naturalLanguageCriteria.length > 0) ||
      (item.expectedToolCalls && item.expectedToolCalls.length > 0),
  );

  if (evaluableItems.length === 0) {
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: Date.now() - startTime,
      results: [],
    };
  }

  const results: EvaluationResult[] = [];

  // Run evaluations sequentially to avoid overwhelming the system
  for (let i = 0; i < evaluableItems.length; i++) {
    const item = evaluableItems[i];

    onProgress?.({
      completed: i,
      total: evaluableItems.length,
      currentItem: item.name,
    });

    const result = await evaluateDatasetItem(item, config);
    results.push(result);
  }

  // Final progress update
  onProgress?.({
    completed: evaluableItems.length,
    total: evaluableItems.length,
    currentItem: "",
  });

  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    totalTests: results.length,
    passedTests,
    failedTests,
    duration: Date.now() - startTime,
    results,
  };
}
