"use client";

import React, { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { usePlaygroundStore } from '../store';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ToolPicker() {
  const {
    origToolMap,
    getCurrentState,
    updateEnabledTools,
  } = usePlaygroundStore();
  
  const currentState = getCurrentState();
  const enabledTools = currentState.enabledTools || {};
  const toolCount = Object.values(enabledTools).reduce((acc, tools) => acc + tools.length, 0);
  
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
  const handleToggleAllTools = (mcpId: string, tools: any[]) => {
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
  const areAllToolsSelected = (mcpId: string, tools: any[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map(tool => tool.name);
    
    return allToolIds.every(id => currentToolsForMcp.includes(id));
  };
  
  // Check if a specific tool is selected
  const isToolSelected = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    return currentToolsForMcp.includes(toolId);
  };
  
  if (!origToolMap || Object.keys(origToolMap).length === 0) {
    return null;
  }
  
  return (
    <DropdownMenu>
      
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              size="sm"
              aria-label="Select Tools"
              className="gap-2"
            >
              Tools <Badge variant="outline">{toolCount}</Badge> <ChevronsUpDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Enabled MCP Tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.entries(origToolMap).map(([mcpId, { name, tools }]) => (
          <DropdownMenuGroup key={mcpId}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center justify-between py-1.5 hover:bg-accent">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{name}</span>
                  {selectedToolCounts[mcpId] > 0 && (
                    <Badge variant="outline">{selectedToolCounts[mcpId]}</Badge>
                  )}
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-56">
                  <DropdownMenuItem 
                    onSelect={(e) => {
                      e.preventDefault();
                    }}
                    className="flex items-center gap-2 py-2"
                  >
                    <div 
                      className="flex items-center space-x-2 w-full cursor-pointer"
                    >
                      <Checkbox 
                        id={`select-all-${mcpId}`}
                        checked={areAllToolsSelected(mcpId, tools)}
                        onCheckedChange={() => handleToggleAllTools(mcpId, tools)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Label
                        className="font-normal"
                        htmlFor={`select-all-${mcpId}`}
                      >
                        Select All
                      </Label>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {tools.map((tool) => (
                    <DropdownMenuItem 
                      key={tool.name}
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                      className="flex items-center gap-2 py-1.5"
                    >
                      <div 
                        className="flex items-center space-x-2 w-full cursor-pointer"
                      >
                        <Checkbox 
                          id={`tool-${mcpId}-${tool.name}`}
                          checked={isToolSelected(mcpId, tool.name)}
                          onCheckedChange={() => handleToggleTool(mcpId, tool.name)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Label 
                          htmlFor={`tool-${mcpId}-${tool.name}`}
                          title={tool.name}
                          className="font-normal"
                        >
                          {tool.name}
                        </Label>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}