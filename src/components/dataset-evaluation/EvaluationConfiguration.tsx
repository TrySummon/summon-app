import React from "react";
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
import LLMPicker, {
  IModelConfiguration,
} from "@/components/llm-picker/LLMPicker";
import { ItemSelectionSection } from "./ItemSelectionSection";
import { DatasetItem } from "@/types/dataset";

interface EvaluationConfigurationProps {
  modelConfig: IModelConfiguration;
  onModelConfigChange: (config: IModelConfiguration) => void;
  evaluableItems: DatasetItem[];
  selectedItems: Set<string>;
  showItemSelection: boolean;
  onToggleItemSelection: () => void;
  onRunEvaluation: () => void;
  isRunning: boolean;
  getTotalSelectedToolCount: () => number;
  // Item selection props
  onItemSelection: (itemId: string, checked: boolean) => void;
  onSelectAllItems: () => void;
  onSelectNoItems: () => void;
  getItemCriteriaCount: (item: DatasetItem) => number;
}

export function EvaluationConfiguration({
  modelConfig,
  onModelConfigChange,
  evaluableItems,
  selectedItems,
  showItemSelection,
  onToggleItemSelection,
  onRunEvaluation,
  isRunning,
  getTotalSelectedToolCount,
  // Item selection props
  onItemSelection,
  onSelectAllItems,
  onSelectNoItems,
  getItemCriteriaCount,
}: EvaluationConfigurationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTubeDiagonal className="h-5 w-5" />
          Evaluation Configuration
        </CardTitle>
        <CardDescription>
          Configure the model and items for running evaluations. Tools can be
          selected in the sidebar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Evaluation Model
            </label>
            <LLMPicker
              config={modelConfig}
              onChange={onModelConfigChange}
              className="w-full"
            />
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
                  onClick={onToggleItemSelection}
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
                onItemSelection={onItemSelection}
                onSelectAllItems={onSelectAllItems}
                onSelectNoItems={onSelectNoItems}
                getItemCriteriaCount={getItemCriteriaCount}
              />
            )}
          </div>

          <Button
            onClick={onRunEvaluation}
            disabled={
              isRunning ||
              !modelConfig.credentialId ||
              !modelConfig.model ||
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
                Run Evaluation ({selectedItems.size} items,{" "}
                {getTotalSelectedToolCount()} tools)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
