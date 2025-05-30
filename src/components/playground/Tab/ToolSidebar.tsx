"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePlaygroundStore } from '../store';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
// Using the ToolParameterDetails component
import { ToolParameterDetails } from "./ToolParameterDetails";
import { cn } from '@/utils/tailwind';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';

interface ToolParameter {
  description?: string;
  type?: string;
  required?: boolean;
  [key: string]: any;
}

interface Tool {
  name: string;
  description?: string;
  parameters?: Record<string, ToolParameter> | null | undefined;
  [key: string]: any;
}

export default function ToolSidebar() {
  const {
    origToolMap,
    getCurrentState,
    updateEnabledTools,
  } = usePlaygroundStore();
  
  const currentState = getCurrentState();
  const enabledTools = currentState.enabledTools || {};
  const toolCount = Object.values(enabledTools).reduce((acc, tools) => acc + tools.length, 0);
  
  // State for expanded MCP sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedTool, setSelectedTool] = useState<{mcpId: string, tool: Tool} | null>(null);
  
  // Initialize all sections as expanded
  useEffect(() => {
    if (origToolMap && Object.keys(origToolMap).length > 0) {
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(origToolMap).forEach(mcpId => {
        initialExpandedState[mcpId] = true;
      });
      setExpandedSections(initialExpandedState);
    }
  }, [origToolMap]);
  
  // Toggle section expansion
  const toggleSection = (mcpId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [mcpId]: !prev[mcpId]
    }));
  };
  
  // Calculate the number of selected tools per MCP
  const selectedToolCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    Object.entries(enabledTools).forEach(([mcpId, toolIds]) => {
      counts[mcpId] = toolIds.length;
    });
    
    return counts;
  }, [enabledTools]);
  
  // Handle toggling a single tool
  const handleToggleTool = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const isSelected = currentToolsForMcp.includes(toolId);
    
    let updatedTools: string[];
    
    if (isSelected) {
      // Remove tool if already selected
      updatedTools = currentToolsForMcp.filter(id => id !== toolId);
    } else {
      // Add tool if not selected
      updatedTools = [...currentToolsForMcp, toolId];
    }
    
    updateEnabledTools(mcpId, updatedTools);
  };
  
  // Handle toggling all tools for an MCP
  const handleToggleAllTools = (mcpId: string, tools: Tool[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map(tool => tool.name);
    
    // If all tools are already selected, deselect all
    // Otherwise, select all
    const allSelected = allToolIds.every(id => currentToolsForMcp.includes(id));
    
    if (allSelected) {
      updateEnabledTools(mcpId, []);
    } else {
      updateEnabledTools(mcpId, allToolIds);
    }
  };
  
  // Check if all tools for an MCP are selected
  const areAllToolsSelected = (mcpId: string, tools: Tool[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map(tool => tool.name);
    
    return allToolIds.every(id => currentToolsForMcp.includes(id));
  };
  
  // Check if a specific tool is selected
  const isToolSelected = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    return currentToolsForMcp.includes(toolId);
  };
  
  // Check if the MCP has any selected tools
  const mcpHasSelectedTools = (mcpId: string) => {
    return (enabledTools[mcpId] || []).length > 0;
  };
  
  // Open tool details modal
  const openToolDetails = (mcpId: string, tool: Tool) => {
    setSelectedTool({ mcpId, tool });
  };
  
  if (!origToolMap || Object.keys(origToolMap).length === 0) {
    return null;
  }

  const mcps = Object.entries(origToolMap).filter(([mcpId, { tools }]) => tools.length > 0);
  
  return (
    <aside className="w-96 border-l border-border h-full bg-background">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Enabled Tools</div>
          <Badge variant="outline">{toolCount}</Badge>
        </div>
      </div>
      
      <div className="h-[calc(100%-48px)] overflow-auto">
        <div className="p-2">
          {mcps.map(([mcpId, { name, tools }]) => (
            <div key={mcpId} className="mb-2">
              <div 
                className={`flex items-center justify-between p-1 rounded-md cursor-pointer hover:bg-secondary/50 ${mcpHasSelectedTools(mcpId) ? 'bg-secondary/30' : ''}`}
                onClick={() => toggleSection(mcpId)}
              >
                <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{name}</span>
                  {expandedSections[mcpId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                  <Badge variant="outline" className={cn("text-xs", !selectedToolCounts[mcpId] && "opacity-0")}>{selectedToolCounts[mcpId] || 0}</Badge>
              </div>
              
              {expandedSections[mcpId] && (
                <div className="mt-1 space-y-1">
                  <div 
                    className="flex items-center px-1 py-1 rounded-md hover:bg-secondary/50 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleAllTools(mcpId, tools);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox 
                        checked={areAllToolsSelected(mcpId, tools)}
                        onCheckedChange={() => handleToggleAllTools(mcpId, tools)}
                      />
                      <Label
                        className="font-medium text-xs cursor-pointer"
                      >
                        Select All
                      </Label>
                    </div>
                  </div>
                  
                  <Separator className="my-1" />
                  
                  {tools.map((tool) => (
                    <div 
                      key={tool.name}
                      className={`px-1 py-1 rounded-md ${isToolSelected(mcpId, tool.name) ? 'bg-secondary/40' : 'hover:bg-secondary/50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTool(mcpId, tool.name);
                          }}
                        >
                          <Checkbox 
                            checked={isToolSelected(mcpId, tool.name)}
                            onCheckedChange={() => handleToggleTool(mcpId, tool.name)}
                          />
                          <Label 
                            title={tool.name}
                            className="font-normal text-xs cursor-pointer"
                          >
                            {tool.name}
                          </Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openToolDetails(mcpId, tool);
                          }}
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                      </div>
                      {tool.description && (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <p className="text-xs text-muted-foreground ml-6 mt-1 line-clamp-2 cursor-help">
                              {tool.description}
                            </p>
                          </HoverCardTrigger>
                          <HoverCardContent side="left" sideOffset={28} align="center" className="w-80 p-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold">{tool.name}</h4>
                              <p className="text-xs">{tool.description}</p>
                            </div>
                          </HoverCardContent>
                        </HoverCard>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {selectedTool && (
        <Sheet open={!!selectedTool} onOpenChange={() => setSelectedTool(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{selectedTool.tool.name}</SheetTitle>
              <SheetDescription className="text-left">
                {selectedTool.tool.description}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <ToolParameterDetails tool={selectedTool.tool} />
            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button>Close</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}
    </aside>
  );
}
