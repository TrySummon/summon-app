import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/tailwind';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from '@/components/ui/hover-card';
import { Pencil } from 'lucide-react';
import type { Tool } from '@modelcontextprotocol/sdk/types';
import type { ModifiedTool } from '../tabState';
import { ToolEditDialog } from './ToolEdit';

interface ToolItemProps {
  tool: Tool;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
  getModifiedName: (mcpId: string, toolName: string, originalName: string) => string;
  getModifiedTool: (mcpId: string, toolName: string) => ModifiedTool | undefined;
  onToolModify: (mcpId: string, toolName: string, modifiedTool: ModifiedTool) => void;
  onToolRevert: (mcpId: string, toolName: string) => void;
}

export default function ToolItem({ 
  tool, 
  mcpId, 
  isSelected, 
  onToggle,
  getModifiedName,
  getModifiedTool,
  onToolModify,
  onToolRevert
}: ToolItemProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const modifiedTool = getModifiedTool(mcpId, tool.name);
  const hasModifications = !!modifiedTool;
  const displayName = getModifiedName(mcpId, tool.name, tool.name);
  const displayDescription = modifiedTool?.description ?? tool.description;

  const handleSave = (modified: ModifiedTool) => {
    onToolModify(mcpId, tool.name, modified);
  };

  const handleRevert = () => {
    onToolRevert(mcpId, tool.name);
  };

  return (
    <>
      <div 
        key={mcpId + tool.name}
        className={cn(
          `group/tool border-b relative`,
          hasModifications && "bg-yellow-100 dark:bg-yellow-900/30"
        )}
      >
        <div className="p-2 py-4">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <Checkbox 
                checked={isSelected}
                onCheckedChange={onToggle}
              />
              <div className="flex items-center gap-2 flex-1">
                <Label 
                  title={tool.name}
                  className={cn(
                    "font-normal text-sm cursor-pointer text-foreground",
                    hasModifications && "text-yellow-800 dark:text-yellow-200"
                  )}
                >
                  {displayName}
                </Label>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
              className={cn(
                "h-6 w-6 -mt-1 p-0 opacity-0 group-hover/tool:opacity-100 transition-opacity",
                hasModifications && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
              )}
              title="Edit tool"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          {displayDescription && (
            <HoverCard openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <p className="text-xs text-muted-foreground/80 ml-6 mt-1 line-clamp-2 leading-relaxed">
                  {displayDescription}
                </p>
              </HoverCardTrigger>
              <HoverCardContent side="left" sideOffset={28} align="center" className="w-80 p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">{displayName}</h4>
                  <p className="text-xs">{displayDescription}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
          )}
        </div>
      </div>

      <ToolEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        tool={tool}
        modifiedTool={modifiedTool}
        onSave={handleSave}
        onRevert={handleRevert}
      />
    </>
  );
}
