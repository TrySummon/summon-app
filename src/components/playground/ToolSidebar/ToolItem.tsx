import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/tailwind';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import type { Tool } from '@modelcontextprotocol/sdk/types';

interface ToolItemProps {
  tool: Tool;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
  getModifiedName: (mcpId: string, toolName: string, originalName: string) => string;
}

export default function ToolItem({ 
  tool, 
  mcpId, 
  isSelected, 
  onToggle,
  getModifiedName
}: ToolItemProps) {
  return (
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
              onToggle();
            }}
          >
            <Checkbox 
              checked={isSelected}
              onCheckedChange={onToggle}
            />
            <Label 
              title={tool.name}
              className="font-normal text-xs cursor-pointer"
            >
              {getModifiedName(mcpId, tool.name, tool.name)}
            </Label>
          </div>
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
                <h4 className="text-sm font-semibold">{getModifiedName(mcpId, tool.name, tool.name)}</h4>
                <p className="text-xs">{tool.description}</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
}
