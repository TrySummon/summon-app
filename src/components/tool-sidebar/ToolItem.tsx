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
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolAnnotations } from "@/lib/mcp/tool";
import { ToolEditDialog } from "./ToolEdit";

interface ToolItemProps {
  tool: Tool;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
}

export default function ToolItem({
  tool,
  mcpId,
  isSelected,
  onToggle,
}: ToolItemProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const annotations = tool.annotations as ToolAnnotations | undefined;

  const isModified = !!annotations?.originalDefinition;

  return (
    <>
      <div
        key={mcpId + tool.name}
        className={cn(`group/tool relative border-b`)}
      >
        <div className="p-2 py-4">
          <div className="flex items-start justify-between">
            <div
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              <Checkbox checked={isSelected} className="flex-shrink-0" />
              <Label
                title={tool.name}
                className={cn(
                  "text-foreground cursor-pointer truncate text-sm font-normal",
                  isModified && "text-blue-600 dark:text-blue-500",
                )}
              >
                {tool.name}
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditDialogOpen(true);
              }}
              className={cn(
                "-mt-1 h-6 w-6 flex-shrink-0 p-0 opacity-0 transition-opacity group-hover/tool:opacity-100",
              )}
              title="Edit tool"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          {tool.description && (
            <HoverCard openDelay={100} closeDelay={100}>
              <HoverCardTrigger asChild>
                <p className="text-muted-foreground/80 mt-1 ml-6 line-clamp-2 text-xs leading-relaxed">
                  {tool.description}
                </p>
              </HoverCardTrigger>
              <HoverCardContent
                side="left"
                sideOffset={28}
                align="center"
                className="w-80 p-4"
              >
                <div className="space-y-2">
                  <h4
                    className="truncate text-sm font-semibold"
                    title={tool.name}
                  >
                    {tool.name}
                  </h4>
                  <p className="text-xs">{tool.description}</p>
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
        mcpId={mcpId}
      />
    </>
  );
}
