import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Play, Loader2, TestTubeDiagonal, ListChecks } from "lucide-react";
import LLMPicker from "@/components/llm-picker/LLMPicker";
import { ItemSelectionSection } from "./ItemSelectionSection";
import { DatasetItem } from "@/types/dataset";
import {
  useEvaluationState,
  useEvaluationToolSelection,
} from "@/stores/evaluationStore";

interface EvaluationConfigurationProps {
  datasetId: string;
  evaluableItems: DatasetItem[];
  onRunEvaluation: () => void;
}

export function EvaluationConfiguration({
  datasetId,
  evaluableItems,
  onRunEvaluation,
}: EvaluationConfigurationProps) {
  const {
    agentModelConfig,
    assertionModelConfig,
    selectedItems,
    isRunning,
    showItemSelection,
    setAgentModelConfig,
    setAssertionModelConfig,
    setShowItemSelection,
    setSelectedItems,
    selectItem,
  } = useEvaluationState(datasetId);

  const { enabledToolCount } = useEvaluationToolSelection(datasetId);

  const onSelectAllItems = useCallback(() => {
    setSelectedItems(new Set(evaluableItems.map((item) => item.id)));
  }, [evaluableItems, setSelectedItems]);

  const onSelectNoItems = useCallback(() => {
    setSelectedItems(new Set());
  }, [setSelectedItems]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTubeDiagonal className="h-5 w-5" />
          Evaluation Configuration
        </CardTitle>
        <CardDescription>
          Configure the models and items for running evaluations. Tools can be
          selected in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Agent Model
              </label>
              <p className="text-muted-foreground mb-2 text-xs">
                Model used to run the agent and generate responses
              </p>
              <LLMPicker
                config={agentModelConfig}
                onChange={setAgentModelConfig}
                className="w-full"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Assertion Model
              </label>
              <p className="text-muted-foreground mb-2 text-xs">
                Model used to evaluate if criteria are met
              </p>
              <LLMPicker
                config={assertionModelConfig}
                onChange={setAssertionModelConfig}
                className="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Item Selection Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dataset Items</p>
                <p className="text-muted-foreground text-sm">
                  {selectedItems.size} of {evaluableItems.length} evaluable
                  items selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowItemSelection(!showItemSelection)}
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  {showItemSelection ? "Hide Items" : "Select Items"}
                </Button>
              </div>
            </div>

            {/* Item Selection UI */}
            {showItemSelection && evaluableItems.length > 0 && (
              <ItemSelectionSection
                evaluableItems={evaluableItems}
                selectedItems={selectedItems}
                onItemSelection={selectItem}
                onSelectAllItems={onSelectAllItems}
                onSelectNoItems={onSelectNoItems}
              />
            )}
          </div>

          <Button
            onClick={onRunEvaluation}
            disabled={
              isRunning ||
              !agentModelConfig.credentialId ||
              !agentModelConfig.model ||
              !assertionModelConfig.credentialId ||
              !assertionModelConfig.model ||
              selectedItems.size === 0
            }
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Evaluation ({selectedItems.size} items, {enabledToolCount}{" "}
                tools enabled)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
