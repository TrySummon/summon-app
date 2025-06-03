import React, { useState, useRef, useEffect } from "react";
import { X, Edit2, Plus } from "lucide-react";
import { usePlaygroundStore } from "./store";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/tailwind";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export default function TabNavigation() {
  const {
    tabs,
    currentTabId,
    closeTab,
    setCurrentTab,
    renameTab,
    duplicateTab,
  } = usePlaygroundStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Start editing a tab name
  const startEditing = (tabId: string, currentName: string) => {
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  // Save the edited tab name
  const saveTabName = () => {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  // Handle key presses in the edit input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveTabName();
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  };

  // Focus the input when editing starts
  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingTabId]);

  // Handle tab close
  const handleCloseTab = (tabId: string) => {
    // Don't allow closing the last tab
    if (Object.keys(tabs).length <= 1) {
      return;
    }

    closeTab(tabId);
  };

  return (
    <div className="flex items-center overflow-x-auto">
      <div className="relative flex flex-1 items-center">
        {Object.entries(tabs).map(([tabId, tab]) => (
          <ContextMenu key={tabId}>
            <ContextMenuTrigger>
              <div
                className={cn(
                  "group relative flex h-12 cursor-pointer items-center border-r px-3",
                  currentTabId === tabId
                    ? "bg-background z-10 -mb-px"
                    : "bg-sidebar hover:bg-muted/40 border-b",
                )}
                onClick={() => setCurrentTab(tabId)}
              >
                {editingTabId === tabId ? (
                  <Input
                    ref={inputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveTabName}
                    onKeyDown={handleKeyDown}
                    className="h-6 w-24 px-1 py-0 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="max-w-[120px] truncate text-sm font-medium">
                    {tab.name}
                  </span>
                )}

                {Object.keys(tabs).length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tabId);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close tab</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => startEditing(tabId, tab.name)}>
                <Edit2 className="mr-2 h-3 w-3" />
                Rename tab
              </ContextMenuItem>
              <ContextMenuItem onClick={() => duplicateTab(tabId)}>
                <Plus className="mr-2 h-3 w-3" />
                Duplicate tab
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => handleCloseTab(tabId)}
                disabled={Object.keys(tabs).length <= 1}
              >
                <X className="mr-2 h-3 w-3" />
                Close tab
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        <div className="bg-sidebar h-12 flex-1 border-b" />
      </div>
    </div>
  );
}
