import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Pencil } from "lucide-react";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import { ToolEditDialog } from "./ToolEdit";
import { ModifiedTool } from "@/stores/types";

interface ToolItemProps {
  tool: Tool;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
  getModifiedName: (
    mcpId: string,
    toolName: string,
    originalName: string,
  ) => string;
  getModifiedTool: (
    mcpId: string,
    toolName: string,
  ) => ModifiedTool | undefined;
  onToolModify: (
    mcpId: string,
    toolName: string,
    modifiedTool: ModifiedTool,
  ) => void;
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
  onToolRevert,
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
          `group/tool relative border-b`,
          hasModifications && "bg-primary/10 dark:bg-primary/20",
        )}
      >
        <div className="p-2 py-4">
          <div className="flex items-start justify-between">
            <div
              className="flex flex-1 cursor-pointer items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <Checkbox checked={isSelected} />
              <div className="flex flex-1 items-center gap-2">
                <Label
                  title={tool.name}
                  className={cn(
                    "text-foreground cursor-pointer text-sm font-normal",
                    hasModifications &&
                      "text-primary dark:text-primary-foreground",
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
                "-mt-1 h-6 w-6 p-0 opacity-0 transition-opacity group-hover/tool:opacity-100",
                hasModifications &&
                  "bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-foreground dark:hover:bg-primary/30",
              )}
              title="Edit tool"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          {displayDescription && (
            <HoverCard openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <p className="text-muted-foreground/80 mt-1 ml-6 line-clamp-2 text-xs leading-relaxed">
                  {displayDescription}
                </p>
              </HoverCardTrigger>
              <HoverCardContent
                side="left"
                sideOffset={28}
                align="center"
                className="w-80 p-4"
              >
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
