import React, { useMemo } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ToolItem from "./ToolItem";
import WaitlistButton from "./WaitlistButton";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ModifiedTool } from "@/stores/types";

interface McpSectionProps {
  mcpId: string;
  name: string;
  tools: Tool[];
  isExpanded: boolean;
  selectedToolCount: number;
  areAllToolsSelected: boolean;
  modifiedToolMap: Record<string, Record<string, ModifiedTool>>;
  onToggleSection: () => void;
  onToggleAllTools: () => void;
  onToggleTool: (toolId: string) => void;
  isToolSelected: (toolId: string) => boolean;
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

export default function McpSection({
  mcpId,
  name,
  tools,
  isExpanded,
  areAllToolsSelected,
  modifiedToolMap,
  onToggleSection,
  onToggleAllTools,
  onToggleTool,
  isToolSelected,
  getModifiedName,
  getModifiedTool,
  onToolModify,
  onToolRevert,
}: McpSectionProps) {
  const hasModifiedTools = Object.keys(modifiedToolMap[mcpId] || {}).length > 0;
  const totalTokenCount = useMemo(() => {
    return tools.reduce((acc, tool) => {
      const tokenCount = tool.annotations?.tokenCount as number | undefined;
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
            <span className="text-sm font-semibold">{name}</span>
          </div>

          {totalTokenCount ? (
            <div className="text-muted-foreground font-mono text-xs">
              {totalTokenCount} tks
            </div>
          ) : null}
        </div>
        {hasModifiedTools && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <WaitlistButton
                  featureName="mcp-tool-save"
                  className="ml-auto h-6 w-fit px-2 text-xs"
                >
                  Save
                </WaitlistButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Your tool changes are active for this tab only.</p>
                <p>Click to open a Pull Request.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
              getModifiedName={getModifiedName}
              getModifiedTool={getModifiedTool}
              onToolModify={onToolModify}
              onToolRevert={onToolRevert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
