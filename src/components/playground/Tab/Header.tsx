import React, { useEffect } from "react";
import { Brush, Undo, Redo, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { usePlaygroundStore } from "../store";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/Kbd";
import { toast } from "sonner";
import { LLMPicker } from "@/components/llm-picker";
import SidebarTrigger from "../ToolSidebar/Trigger";
import { DatasetSelector } from "../DatasetSelector";

export default function TabHeader() {
  const currentTabId = usePlaygroundStore((state) => state.currentTabId);
  const historyIndex = usePlaygroundStore(
    (state) => state.tabs[currentTabId]?.historyIndex,
  );
  const history = usePlaygroundStore(
    (state) => state.tabs[currentTabId]?.history,
  );
  const currentState = usePlaygroundStore(
    (state) => state.tabs[currentTabId]?.state,
  );
  const duplicateTab = usePlaygroundStore((state) => state.duplicateTab);
  const updateCurrentState = usePlaygroundStore(
    (state) => state.updateCurrentState,
  );
  const clearCurrentTab = usePlaygroundStore((state) => state.clearCurrentTab);
  const undo = usePlaygroundStore((state) => state.undo);
  const redo = usePlaygroundStore((state) => state.redo);
  const updateSelectedDatasetId = usePlaygroundStore(
    (state) => state.updateSelectedDatasetId,
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Use state to track the current playground state
  const isRunning = currentState.running;

  const handleUndo = () => {
    const description = undo();
    if (description) {
      toast.info(`Undo: ${description}`);
    }
  };

  const handleRedo = () => {
    const description = redo();
    if (description) {
      toast.info(`Redo: ${description}`);
    }
  };

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if focus is in a CodeMirror editor, input, or textarea
      const isInCodeMirror =
        document.activeElement?.closest(".cm-editor") !== null;
      const isInInput =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";

      // Don't handle shortcuts if we're in CodeMirror, input, or textarea
      if (isInCodeMirror || isInInput) {
        return;
      }

      // Check for Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if (e.metaKey && e.key === "z" && !e.shiftKey) {
        if (canUndo && !isRunning) {
          e.preventDefault();
          handleUndo();
        }
      }

      // Check for Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
      if (e.metaKey && e.key === "z" && e.shiftKey) {
        if (canRedo && !isRunning) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, isRunning]);

  return (
    <div className="flex items-center justify-between gap-2 px-3">
      <div className="flex gap-2">
        <LLMPicker
          config={{
            credentialId: currentState.credentialId,
            model: currentState.model,
            settings: currentState.settings,
          }}
          onChange={(config) =>
            updateCurrentState((state) => ({
              ...state,
              credentialId: config.credentialId,
              model: config.model,
              settings: config.settings,
            }))
          }
        />
        <DatasetSelector
          selectedDatasetId={currentState.selectedDatasetId}
          onDatasetChange={updateSelectedDatasetId}
        />
        {/* Tools button removed as sidebar is now always visible */}
      </div>
      <div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => duplicateTab(currentTabId)}
              variant="ghost"
              size="icon"
              aria-label="Duplicate tab"
              disabled={isRunning}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-1">
              <p>Duplicate tab</p>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleUndo}
              variant="ghost"
              size="icon"
              aria-label="Undo"
              disabled={!canUndo || isRunning}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-1">
              <p>Undo</p>
              <Kbd className="z-10">cmd+z</Kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleRedo}
              variant="ghost"
              size="icon"
              aria-label="Redo"
              disabled={!canRedo || isRunning}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex items-center gap-1">
              <p>Redo</p>
              <Kbd className="z-10">cmd+shift+z</Kbd>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() =>
                confirm(
                  `Are you sure you want to clear the tab messages and tool modifications?`,
                ) && clearCurrentTab()
              }
              disabled={isRunning}
              variant="ghost"
              size="icon"
              aria-label="Clear tab messages and tool modifications"
            >
              <Brush className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear tab messages and tool modifications</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger showOnlyOnOpen />
          </TooltipTrigger>
          <TooltipContent>
            <p>Open tools</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
