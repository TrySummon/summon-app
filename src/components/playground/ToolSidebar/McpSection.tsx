import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/tailwind';
import ToolItem from './ToolItem';
import type { Tool } from '@modelcontextprotocol/sdk/types';

interface McpSectionProps {
  mcpId: string;
  name: string;
  tools: Tool[];
  isExpanded: boolean;
  selectedToolCount: number;
  areAllToolsSelected: boolean;
  onToggleSection: () => void;
  onToggleAllTools: () => void;
  onToggleTool: (toolId: string) => void;
  isToolSelected: (toolId: string) => boolean;
  getModifiedName: (mcpId: string, toolName: string, originalName: string) => string;
}

export default function McpSection({
  mcpId,
  name,
  tools,
  isExpanded,
  selectedToolCount,
  areAllToolsSelected,
  onToggleSection,
  onToggleAllTools,
  onToggleTool,
  isToolSelected,
  getModifiedName
}: McpSectionProps) {
  return (
    <div key={mcpId}>
      <div 
        className={`flex items-center justify-between p-2 cursor-pointer sticky z-10 top-0 bg-sidebar text-muted-foreground`}
        onClick={onToggleSection}
      >
        <div className="flex items-center gap-2 select-none">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">{name}</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs select-none", !selectedToolCount && "opacity-0")}
        >
          {selectedToolCount || 0}
        </Badge>
      </div>
      
      {isExpanded && (
        <div className="">
          <div 
            className="flex items-center p-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAllTools();
            }}
          >
            <div className="flex items-center gap-2 w-full">
              <Checkbox 
                checked={areAllToolsSelected}
                onCheckedChange={onToggleAllTools}
              />
              <Label
                className="font-medium text-xs cursor-pointer"
              >
                Select All
              </Label>
            </div>
          </div>
          
          {tools.map((tool) => (
            <ToolItem
              key={mcpId + tool.name}
              tool={tool}
              mcpId={mcpId}
              isSelected={isToolSelected(tool.name)}
              onToggle={() => onToggleTool(tool.name)}
              getModifiedName={getModifiedName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
