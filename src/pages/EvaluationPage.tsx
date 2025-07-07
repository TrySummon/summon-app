import React, { useState } from "react";
import { useDatasets } from "@/hooks/useDatasets";
import { SafeDatasetEvaluation } from "@/components/dataset-evaluation";
import { useEvaluationState } from "@/stores/evaluationStore";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestTubeDiagonal, Database } from "lucide-react";

const EvaluationPage: React.FC = () => {
  const { datasets, isLoading } = useDatasets();
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");

  const selectedDataset = datasets.find(
    (dataset) => dataset.id === selectedDatasetId,
  );

  const evaluableDatasets = datasets.filter((dataset) =>
    dataset.items.some(
      (item) =>
        (item.naturalLanguageCriteria &&
          item.naturalLanguageCriteria.length > 0) ||
        (item.expectedToolCalls && item.expectedToolCalls.length > 0),
    ),
  );

  // Always call the hook with a fallback value to avoid conditional hook calls
  const evaluationState = useEvaluationState(
    selectedDatasetId || "placeholder",
  );
  const isEvaluating = selectedDatasetId ? evaluationState.isRunning : false;

  if (isLoading) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>
                <TestTubeDiagonal className="mr-2 size-3" /> Evaluation
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="bg-background flex-shrink-0 border-b p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Dataset:</label>
          <Select
            value={selectedDatasetId}
            onValueChange={setSelectedDatasetId}
            disabled={isEvaluating}
          >
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Choose a dataset to evaluate..." />
            </SelectTrigger>
            <SelectContent>
              {evaluableDatasets.length === 0 ? (
                <SelectItem value="" disabled>
                  No datasets with evaluation criteria found
                </SelectItem>
              ) : (
                evaluableDatasets.map((dataset) => {
                  const evaluableItemsCount = dataset.items.filter(
                    (item) =>
                      (item.naturalLanguageCriteria &&
                        item.naturalLanguageCriteria.length > 0) ||
                      (item.expectedToolCalls &&
                        item.expectedToolCalls.length > 0),
                  ).length;

                  return (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>{dataset.name}</span>
                        <span className="text-muted-foreground text-sm">
                          ({evaluableItemsCount} evaluable items)
                        </span>
                      </div>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
          {isEvaluating && (
            <span className="text-muted-foreground text-sm">
              Evaluation in progress...
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!selectedDatasetId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-muted-foreground text-center">
              {evaluableDatasets.length === 0 ? (
                <>
                  <TestTubeDiagonal className="mx-auto mb-4 h-12 w-12" />
                  <p className="mb-2 text-lg font-medium">
                    No Evaluable Datasets Found
                  </p>
                  <p className="text-sm">
                    To use evaluation, create datasets with items that have
                    natural language criteria or expected tool calls.
                  </p>
                </>
              ) : (
                <>
                  <TestTubeDiagonal className="mx-auto mb-4 h-12 w-12" />
                  <p className="mb-2 text-lg font-medium">
                    Select a Dataset to Evaluate
                  </p>
                  <p className="text-sm">
                    Choose a dataset from the dropdown above to start
                    evaluating.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          selectedDataset && (
            <SafeDatasetEvaluation
              items={selectedDataset.items}
              datasetId={selectedDatasetId}
            />
          )
        )}
      </div>
    </div>
  );
};

export default EvaluationPage;
