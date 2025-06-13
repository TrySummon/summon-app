import React, { useState } from "react";
import { Scissors, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaygroundStore } from "../store";
import { useLocalDatasets } from "@/hooks/useLocalDatasets";
import { toast } from "sonner";
import CreateDatasetItemDialog from "./CreateDatasetItemDialog";

export default function CutModeActionBar() {
  const currentState = usePlaygroundStore((state) => state.getCurrentState());
  const currentTab = usePlaygroundStore((state) => state.getCurrentTab());
  const updateCurrentState = usePlaygroundStore(
    (state) => state.updateCurrentState,
  );
  const { getDataset, addItem } = useLocalDatasets();

  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedDatasetId = currentState.selectedDatasetId;
  const cutPosition = currentState.cutPosition;
  const selectedDataset = selectedDatasetId
    ? getDataset(selectedDatasetId)
    : null;

  const handleCancel = () => {
    updateCurrentState((state) => ({
      ...state,
      cutMode: false,
      selectedDatasetId: undefined,
      cutPosition: undefined,
    }));
  };

  const handleConfirm = async (data: {
    name: string;
    description?: string;
    naturalLanguageCriteria: string[];
    expectedToolCalls: string[];
  }) => {
    if (!selectedDatasetId || !selectedDataset) {
      toast.error("No dataset selected");
      return;
    }

    try {
      const messages = currentState.messages;

      if (messages.length === 0) {
        toast.error("No messages to save");
        return;
      }

      // Add the conversation to the dataset with the new fields
      await addItem(selectedDatasetId, {
        name: data.name,
        description: data.description,
        messages: messages,
        systemPrompt: currentState.systemPrompt,
        model: currentState.model,
        settings: currentState.settings,
        naturalLanguageCriteria:
          data.naturalLanguageCriteria.length > 0
            ? data.naturalLanguageCriteria
            : undefined,
        expectedToolCalls:
          data.expectedToolCalls.length > 0
            ? data.expectedToolCalls
            : undefined,
        inputOutputCutPosition: cutPosition,
      });

      toast.success(`Saved "${data.name}" to "${selectedDataset.name}"`);

      // Exit cut mode
      updateCurrentState((state) => ({
        ...state,
        cutMode: false,
        selectedDatasetId: undefined,
        cutPosition: undefined,
      }));

      // Close dialog
      setDialogOpen(false);
    } catch (error) {
      console.error("Error saving to dataset:", error);
      toast.error("Failed to save to dataset");
    }
  };

  if (cutPosition === undefined) {
    return null;
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-4xl flex-col px-4">
        <div className="rounded-md border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-900">
              <Scissors className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Creating Dataset Item
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Show us where the input ends.
              </p>
            </div>
          </div>

          <div className="mb-3 rounded-sm bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
            <span className="font-medium">Tip:</span> Click the scissor icons
            between messages to separate input from output. Messages before the
            cut will be used as input, and messages after will be the expected
            output.
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <Database className="h-3.5 w-3.5" />
              <span>
                Dataset:{" "}
                <span className="font-medium">{selectedDataset?.name}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-8 border-blue-200 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Create Item
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CreateDatasetItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirm}
        datasetName={selectedDataset?.name || ""}
        defaultName={currentTab?.name || "Conversation"}
        messages={currentState.messages}
        cutPosition={cutPosition}
      />
    </>
  );
}
