import React, { useState, useRef, useEffect } from 'react';
import { X, Edit2, Plus } from 'lucide-react';
import { usePlaygroundStore } from './store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwind';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
    createTab,
    closeTab,
    setCurrentTab,
    renameTab,
    duplicateTab,
  } = usePlaygroundStore();

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
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
    if (e.key === 'Enter') {
      saveTabName();
    } else if (e.key === 'Escape') {
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
  
  // Create a new tab with a default name based on the number of tabs
  const handleCreateTab = () => {
    const tabCount = Object.keys(tabs).length;
    createTab(undefined, `Tab ${tabCount + 1}`);
  };



  return (
    <div className="flex items-center overflow-x-auto">
      <div className="flex-1 flex items-center relative">
        {Object.entries(tabs).map(([tabId, tab]) => (
          <ContextMenu key={tabId}>
            <ContextMenuTrigger>
              <div 
                className={cn(
                  "flex items-center h-12 px-3 relative group cursor-pointer border-r",
                  currentTabId === tabId 
                    ? "bg-background z-10 -mb-px" 
                    : "bg-sidebar hover:bg-muted/40 border-b"
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
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {tab.name}
                  </span>
                )}
                
                {Object.keys(tabs).length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <Edit2 className="h-3 w-3 mr-2" />
                Rename tab
              </ContextMenuItem>
              <ContextMenuItem onClick={() => duplicateTab(tabId)}>
                <Plus className="h-3 w-3 mr-2" />
                Duplicate tab
              </ContextMenuItem>
              <ContextMenuItem 
                onClick={() => handleCloseTab(tabId)}
                disabled={Object.keys(tabs).length <= 1}
              >
                <X className="h-3 w-3 mr-2" />
                Close tab
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
        <div className="flex-1 h-12 border-b bg-sidebar" />
      </div>
    </div>
  );
}
