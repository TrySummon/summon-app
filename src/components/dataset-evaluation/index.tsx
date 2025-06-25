import React, { useMemo, useEffect } from "react";
import { DatasetItem } from "@/types/dataset";
import { runEvaluation, EvaluationConfig } from "@/lib/evaluation/runner";
import {
  useEvaluationToolSelection,
  useEvaluationState,
} from "@/stores/evaluationStore";
import { EvaluationConfiguration } from "./EvaluationConfiguration";
import { EvaluationProgress } from "./EvaluationProgress";
import { EvaluationResults } from "./EvaluationResults";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ToolSidebarTrigger from "../tool-sidebar/Trigger";
import EvaluationToolSidebar from "./EvaluationToolSidebar";

interface DatasetEvaluationProps {
  items: DatasetItem[];
  datasetId: string;
}

function DatasetEvaluation({ items, datasetId }: DatasetEvaluationProps) {
  const {
    agentModelConfig,
    assertionModelConfig,
    selectedItems,
    setSelectedItems,
    setIsRunning,
    progress,
    setProgress,
    results,
    setResults,
  } = useEvaluationState(datasetId);

  const { modifiedToolMap, mcpToolMap, enabledTools, enabledToolCount } =
    useEvaluationToolSelection(datasetId);

  // Filter items that can be evaluated
  const evaluableItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.naturalLanguageCriteria &&
            item.naturalLanguageCriteria.length > 0) ||
          (item.expectedToolCalls && item.expectedToolCalls.length > 0),
      ),
    [items],
  );

  // Initialize selected items when evaluable items change
  useEffect(() => {
    const evaluableItemIds = evaluableItems.map((item) => item.id);
    setSelectedItems(new Set(evaluableItemIds));
  }, [evaluableItems, setSelectedItems]);

  const handleRunEvaluation = async () => {
    if (!agentModelConfig.credentialId || !agentModelConfig.model) {
      alert("Please select an agent model before running evaluation");
      return;
    }

    if (!assertionModelConfig.credentialId || !assertionModelConfig.model) {
      alert("Please select an assertion model before running evaluation");
      return;
    }

    if (selectedItems.size === 0) {
      alert("Please select at least one item to evaluate");
      return;
    }

    setIsRunning(true);
    setProgress(null);
    setResults(null);

    try {
      const config: EvaluationConfig = {
        agentCredentialId: agentModelConfig.credentialId,
        agentModel: agentModelConfig.model,
        assertionCredentialId: assertionModelConfig.credentialId,
        assertionModel: assertionModelConfig.model,
        maxSteps: 5,
        enabledTools,
        modifiedToolMap,
        mcpToolMap,
      };

      // Only evaluate selected items
      const itemsToEvaluate = evaluableItems.filter((item) =>
        selectedItems.has(item.id),
      );

      const summary = await runEvaluation(
        itemsToEvaluate,
        config,
        (progress) => {
          setProgress(progress);
        },
      );

      setResults(summary);
    } catch (error) {
      console.error("Evaluation failed:", error);
      alert(
        "Evaluation failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      );
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  };

  return (
    <SidebarProvider
      className="flex min-h-0 flex-1"
      defaultWidth="18rem"
      mobileBreakpoint={1200}
    >
      <SidebarInset className="container flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
        {/* Tools Header */}
        <div className="flex items-center justify-end px-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolSidebarTrigger showOnlyOnOpen size="sm" className="gap-2">
                  {enabledToolCount} tools enabled
                </ToolSidebarTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open tools</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Configuration Section */}
        <EvaluationConfiguration
          datasetId={datasetId}
          evaluableItems={evaluableItems}
          onRunEvaluation={handleRunEvaluation}
        />

        {/* Progress Section */}
        <EvaluationProgress progress={progress} />

        {/* Results Section */}
        <EvaluationResults results={results} />
      </SidebarInset>

      {/* Tool Selection Sidebar */}
      <EvaluationToolSidebar datasetId={datasetId} />
    </SidebarProvider>
  );
}

export function SafeDatasetEvaluation({
  items,
  datasetId,
}: DatasetEvaluationProps) {
  const { isReady, initializeDataset } = useEvaluationState(datasetId);

  // Ensure dataset exists with default state
  useEffect(() => {
    initializeDataset();
  }, [datasetId, initializeDataset]);

  if (!isReady) {
    return null;
  }

  return <DatasetEvaluation items={items} datasetId={datasetId} />;
}
