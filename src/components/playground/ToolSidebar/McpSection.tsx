import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";
import ToolItem from "./ToolItem";
import WaitlistButton from "./WaitlistButton";
import { usePlaygroundStore } from "../store";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import type { ModifiedTool } from "../tabState";

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
  selectedToolCount,
  areAllToolsSelected,
  onToggleSection,
  onToggleAllTools,
  onToggleTool,
  isToolSelected,
  getModifiedName,
  getModifiedTool,
  onToolModify,
  onToolRevert,
}: McpSectionProps) {
  const modifiedToolMap = usePlaygroundStore(
    (state) => state.getCurrentState().modifiedToolMap,
  );
  const hasModifiedTools = Object.keys(modifiedToolMap[mcpId] || {}).length > 0;

  return (
    <div key={mcpId}>
      <div
        className={`text-foreground bg-accent sticky top-0 z-10 flex cursor-pointer items-center justify-between p-2`}
        onClick={onToggleSection}
      >
        <div className="flex items-center gap-2 select-none">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-sm font-semibold">{name}</span>
          {hasModifiedTools && (
            <WaitlistButton
              featureName="mcp-tool-save"
              className="h-6 px-2 text-xs"
            >
              Save
            </WaitlistButton>
          )}
        </div>

        <Badge
          variant="outline"
          className={cn(
            "text-xs select-none",
            !selectedToolCount && "opacity-0",
          )}
        >
          {selectedToolCount || 0}
        </Badge>
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
              <Checkbox
                checked={areAllToolsSelected}
                onCheckedChange={onToggleAllTools}
              />
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
