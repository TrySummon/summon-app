import React, { useState } from "react";
import { Save, Database, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CreateDatasetDialog } from "@/components/CreateDatasetDialog";
import { useDatasets } from "@/hooks/useDatasets";
import { usePlaygroundStore } from "../store";

export function SaveToDatasetButton() {
  const currentTabId = usePlaygroundStore((state) => state.currentTabId);
  const currentState = usePlaygroundStore(
    (state) => state.tabs[currentTabId]?.state,
  );
  const updateCurrentState = usePlaygroundStore(
    (state) => state.updateCurrentState,
  );

  const { datasets } = useDatasets();
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [createDatasetDialogOpen, setCreateDatasetDialogOpen] = useState(false);

  // Return null if there are no messages in the current tab
  if (!currentState?.messages || currentState.messages.length === 0) {
    return null;
  }

  const isRunning = currentState?.running;

  const handleDatasetSelect = (datasetId: string) => {
    updateCurrentState((state) => ({
      ...state,
      cutMode: true,
      cutPosition: 1,
      selectedDatasetId: datasetId,
    }));
    setSavePopoverOpen(false);
  };

  const handleCreateDatasetSuccess = (datasetId: string) => {
    setCreateDatasetDialogOpen(false);
    setSavePopoverOpen(false);
    handleDatasetSelect(datasetId);
  };

  return (
    <>
      <Popover open={savePopoverOpen} onOpenChange={setSavePopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Save to dataset"
                disabled={isRunning}
              >
                <Save className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save to dataset</p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-[300px] p-0" align="end">
          <div className="flex items-center justify-between p-2">
            <span className="text-xs font-semibold">Save to Dataset</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateDatasetDialogOpen(true);
                }}
                title="Create new dataset"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="border-t">
            <div className="space-y-1 p-1">
              {datasets.length > 0 ? (
                datasets.map((dataset) => (
                  <Button
                    key={dataset.id}
                    variant="ghost"
                    className="h-auto w-full justify-start p-2"
                    onClick={() => handleDatasetSelect(dataset.id!)}
                  >
                    <div className="flex w-full items-center gap-2">
                      <Database className="text-muted-foreground h-4 w-4 shrink-0" />
                      <div className="flex min-w-0 flex-1 items-center justify-between">
                        <span className="truncate text-sm font-medium">
                          {dataset.name}
                        </span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {dataset.items.length} items
                        </span>
                      </div>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="text-muted-foreground py-4 text-center text-sm">
                  No datasets available
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <CreateDatasetDialog
        open={createDatasetDialogOpen}
        onOpenChange={setCreateDatasetDialogOpen}
        onSuccess={handleCreateDatasetSuccess}
      />
    </>
  );
}
