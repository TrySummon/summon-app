import React, { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import ToolItem from "./ToolItem";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ToolAnnotations } from "@/lib/mcp/tool";

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
}: McpSectionProps) {
  const totalTokenCount = useMemo(() => {
    return tools.reduce((acc, tool) => {
      const annotations = tool.annotations as ToolAnnotations | undefined;
      const tokenCount =
        annotations?.optimisedTokenCount || annotations?.tokenCount;
      const isSelected = isToolSelected(tool.name);
      return acc + (isSelected && tokenCount ? tokenCount : 0);
    }, 0);
  }, [isToolSelected, tools]);

  return (
    <div key={mcpId}>
      <div
        className={`text-foreground bg-accent sticky top-0 z-10 flex flex-col gap-1 p-2`}
      >
        <div
          onClick={onToggleSection}
          className="flex cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-2 select-none">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span
              className={`text-sm font-semibold ${selectedToolCount > 0 ? "text-primary" : ""}`}
            >
              {name}
            </span>
          </div>

          {totalTokenCount ? (
            <div className="text-muted-foreground font-mono text-xs">
              {totalTokenCount} tks
            </div>
          ) : null}
        </div>
      </div>

      {isExpanded && (
        <div className="">
          <div
            className="flex cursor-pointer items-center p-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAllTools();
            }}
          >
            <div className="flex w-full items-center gap-2">
              <Checkbox checked={areAllToolsSelected} />
              <Label className="text-foreground cursor-pointer text-sm font-medium">
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
