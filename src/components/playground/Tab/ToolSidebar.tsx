"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePlaygroundStore } from '../store';
import { cn } from '@/utils/tailwind';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
} from "@/components/ui/sidebar";
import SidebarTrigger from './SidebarTrigger';
import { ToolParameterSchema } from '@/components/mcp-explorer/ToolParameterSchema';

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
  
  if (!origToolMap || Object.keys(origToolMap).length === 0) {
    return null;
  }

  const mcps = Object.entries(origToolMap).filter(([mcpId, { tools }]) => tools.length > 0);
  
  return (
    <Sidebar side="right" className='top-[var(--tab-header-height)] !h-[calc(100svh-var(--tab-header-height))]'>
            <SidebarHeader className="border-b px-2">
<div className='flex items-center justify-between'>
  <div className='flex items-center'>
    <SidebarTrigger showOnlyOnDesktop className="-ml-1.5" />
          <div className="text-sm font-medium">Enabled Tools</div>
          </div>
          <Badge className='select-none' variant="outline">{toolCount}</Badge>
      </div>
      </SidebarHeader>
      <SidebarContent className='overflow-y-auto overflow-x-hidden gap-0 py-1'>
          {mcps.map(([mcpId, { name, tools }]) => (
            <div key={mcpId}>
              <div 
                className={`flex items-center justify-between p-2 cursor-pointer sticky z-10 top-0 bg-sidebar text-muted-foreground`}
                onClick={() => toggleSection(mcpId)}
              >
                <div className="flex items-center gap-2 select-none">
                {expandedSections[mcpId] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="font-medium text-sm">{name}</span>
                </div>
                  <Badge variant="outline" className={cn("text-xs select-none", !selectedToolCounts[mcpId] && "opacity-0")}>{selectedToolCounts[mcpId] || 0}</Badge>
              </div>
              
              {expandedSections[mcpId] && (
                <div className="">
                  <div 
                    className="flex items-center p-2 cursor-pointer"
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
                  
                  {tools.map((tool) => (
                    <div 
                      key={mcpId + tool.name}
                      className={cn(`group/tool border-b relative`)}
                    >
                      <div className="p-2 py-4">
                      <div className="flex items-start justify-between">
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
                        <ToolParameterSchema editable schema={tool.inputSchema} name={tool.name} className='opacity-0 group-hover/tool:opacity-100 -mt-1' />
                      </div>
                      {tool.description && (
                        <HoverCard openDelay={100} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <p className="text-xs text-muted-foreground ml-6 mt-1 line-clamp-2">
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
                  </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </SidebarContent>

    </Sidebar>
  );
}
