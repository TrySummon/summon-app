import React, { useState, useMemo } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Play, Search, X } from "lucide-react";
import { extractToolParameters } from "./utils";
import { JsonSchema } from "../json-schema";
import { AddEndpointsButton } from "./AddEndpointsButton";
import { CallToolDialog } from "./CallToolDialog";
import { OptimizeToolButton } from "./OptimizeToolButton";
import { RevertToolButton } from "./RevertToolButton";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { useToolAnimations } from "@/hooks/useToolAnimations";
import { ToolAnnotations } from "@/lib/mcp/tools/types";
import { ToolDefinitionDialog } from "@/components/ui/ToolDefinitionDialog";
import { ToolDefinitionViewerItem } from "@/components/ui/ToolDefinitionViewer";
import { Input } from "@/components/ui/input";

const getTokenCountBadgeVariant = (count: number) => {
  if (count < 500) return "text-green-600 dark:text-green-400";
  if (count < 1000) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

const formatTokenCount = (tool: Tool) => {
  const originalCount = tool.annotations?.tokenCount as number | undefined;
  const optimisedCount = tool.annotations?.optimisedTokenCount as
    | number
    | undefined;

  if (!originalCount) return null;

  if (optimisedCount && optimisedCount !== originalCount) {
    const change = optimisedCount - originalCount;
    const changePercentage = Math.round((change / originalCount) * 100);
    const sign = change > 0 ? "+" : "";
    return {
      displayCount: optimisedCount,
      text: `${optimisedCount} tks (${sign}${changePercentage}%)`,
      isOptimised: true,
    };
  }

  return {
    displayCount: originalCount,
    text: `${originalCount} tks`,
    isOptimised: false,
  };
};

interface ToolItemProps {
  tool: Tool;
  index: number;
  mcpId: string;
  onDeleteTool?: (toolName: string) => void;
  refreshStatus: () => void;
  onCallTool: (tool: Tool) => void;
  onViewToolDefinition: (tool: Tool) => void;
  getAnimationClasses: (id: string) => string;
}

const ToolItem: React.FC<ToolItemProps> = ({
  tool,
  index,
  mcpId,
  onDeleteTool,
  refreshStatus,
  onCallTool,
  onViewToolDefinition,
  getAnimationClasses,
}) => {
  const annotations = tool.annotations as unknown as ToolAnnotations;
  const toolId = annotations.isExternal ? tool.name : annotations.id;
  return (
    <AccordionItem
      key={tool.name}
      value={`tool-${index}`}
      className={getAnimationClasses(toolId)}
    >
      <AccordionTrigger className="group hover:no-underline">
        <div className="flex flex-col items-start gap-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium">{tool.name}</span>
            {(() => {
              const tokenInfo = formatTokenCount(tool);
              if (!tokenInfo) return null;

              if (tokenInfo.isOptimised) {
                return (
                  <button
                    className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    title={`Optimised from ${tool.annotations?.tokenCount} tokens - Click to view definition`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewToolDefinition(tool);
                    }}
                  >
                    {tokenInfo.text}
                  </button>
                );
              }

              return (
                <button
                  className={`font-mono text-xs transition-colors hover:underline ${getTokenCountBadgeVariant(tokenInfo.displayCount)}`}
                  title="Click to view tool definition"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewToolDefinition(tool);
                  }}
                >
                  {tokenInfo.text}
                </button>
              );
            })()}
            <div className="flex items-center gap-2">
              {tool.annotations?.optimisedTokenCount ? (
                <RevertToolButton
                  tool={tool}
                  mcpId={mcpId}
                  refreshStatus={refreshStatus}
                />
              ) : (
                <OptimizeToolButton
                  tool={tool}
                  mcpId={mcpId}
                  refreshStatus={refreshStatus}
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onCallTool(tool);
                }}
                title="Call tool"
              >
                <Play className="h-3 w-3" />
              </Button>
              {onDeleteTool && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const confirmed = window.confirm(
                      `Are you sure you want to delete the tool "${tool.name}"? This action cannot be undone.`,
                    );
                    if (confirmed) {
                      onDeleteTool(
                        (tool.annotations as unknown as ToolAnnotations).id,
                      );
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          {tool.description && (
            <p className="text-muted-foreground line-clamp-2 text-sm font-normal">
              {tool.description}
            </p>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 rounded-md border p-4">
          {/* Display tool schema details */}
          {tool.inputSchema &&
          tool.inputSchema.properties &&
          Object.keys(tool.inputSchema.properties).length > 0 ? (
            <div>
              <div className="space-y-4">
                {extractToolParameters(tool).map((param, idx) => (
                  <div key={idx}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-foreground font-mono text-xs font-semibold">
                        {param.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground font-mono text-xs"
                      >
                        {param.type}
                      </Badge>
                      {param.required && (
                        <Badge
                          variant="outline"
                          className="border-red-500/50 bg-red-500/10 font-mono text-xs text-red-500"
                        >
                          required
                        </Badge>
                      )}
                      {param.schema &&
                        (param.type === "object" ||
                          (param.properties &&
                            Object.keys(param.properties).length > 0)) && (
                          <div className="ml-auto">
                            <JsonSchema
                              schema={param.schema}
                              name={param.name}
                            />
                          </div>
                        )}
                    </div>

                    {param.description && (
                      <p className="text-muted-foreground mb-2 text-xs">
                        {param.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              This tool has no parameters.
            </p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

interface ToolsListProps {
  tools: Tool[];
  mcpId: string;
  refreshStatus: () => void;
  onDeleteTool?: (toolName: string) => void;
  onDeleteAllTools?: () => void;
  onAddEndpoints?: (apiId: string, tools: SelectedEndpoint[]) => void;
}

export const ToolsList: React.FC<ToolsListProps> = ({
  tools,
  mcpId,
  onDeleteTool,
  onDeleteAllTools,
  onAddEndpoints,
  refreshStatus,
}) => {
  const [callToolDialogOpen, setCallToolDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolDefinitionDialogOpen, setToolDefinitionDialogOpen] =
    useState(false);
  const [selectedToolForViewing, setSelectedToolForViewing] =
    useState<Tool | null>(null);
  const { getAnimationClasses } = useToolAnimations({ mcpId });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  // Filter tools by name or description
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        (tool.description && tool.description.toLowerCase().includes(q)),
    );
  }, [tools, searchQuery]);

  const handleCallTool = (tool: Tool) => {
    setSelectedTool(tool);
    setCallToolDialogOpen(true);
  };

  const handleViewToolDefinition = (tool: Tool) => {
    setSelectedToolForViewing(tool);
    setToolDefinitionDialogOpen(true);
  };

  const toolDefinitionItems = useMemo(() => {
    if (!selectedToolForViewing) return [];

    const annotations =
      selectedToolForViewing.annotations as unknown as ToolAnnotations;
    const originalDefinition = annotations.originalDefinition;

    const item: ToolDefinitionViewerItem = {
      name: selectedToolForViewing.name,
      current: {
        name: selectedToolForViewing.name,
        description: selectedToolForViewing.description || "",
        inputSchema: selectedToolForViewing.inputSchema,
      },
    };

    if (originalDefinition) {
      item.original = {
        name: originalDefinition.name,
        description: originalDefinition.description,
        inputSchema: originalDefinition.inputSchema,
      };
    }

    return [item];
  }, [selectedToolForViewing]);

  if (tools.length === 0) {
    return (
      <div className="w-full py-6 text-center">
        <p className="mb-1 text-sm font-medium">This MCP has no tools.</p>
        {onAddEndpoints ? (
          <>
            <p className="text-muted-foreground mb-4 text-xs">
              Create tools with our AI agent. You can also add tools manually.
            </p>
            <AddEndpointsButton onAddEndpoints={onAddEndpoints} />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tools..."
            className="border-input h-8 border bg-transparent pr-8 pl-9 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchQuery && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 m-0 -translate-y-1/2 p-0"
              onClick={handleClearSearch}
              tabIndex={-1}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {onDeleteAllTools && tools.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              const confirmed = window.confirm(
                `Are you sure you want to delete all ${tools.length} tools? This action cannot be undone.`,
              );
              if (confirmed) {
                onDeleteAllTools();
              }
            }}
          >
            Delete All Tools
          </Button>
        )}
      </div>

      {onAddEndpoints ? (
        <AddEndpointsButton onAddEndpoints={onAddEndpoints} />
      ) : null}

      <Accordion type="single" collapsible className="w-full">
        {filteredTools.map((tool, index) => (
          <ToolItem
            key={tool.name}
            tool={tool}
            index={index}
            mcpId={mcpId}
            onDeleteTool={onDeleteTool}
            refreshStatus={refreshStatus}
            onCallTool={handleCallTool}
            onViewToolDefinition={handleViewToolDefinition}
            getAnimationClasses={getAnimationClasses}
          />
        ))}
      </Accordion>

      <CallToolDialog
        tool={selectedTool}
        mcpId={mcpId}
        open={callToolDialogOpen}
        onOpenChange={setCallToolDialogOpen}
      />

      {selectedToolForViewing && (
        <ToolDefinitionDialog
          open={toolDefinitionDialogOpen}
          onOpenChange={setToolDefinitionDialogOpen}
          items={toolDefinitionItems}
          title={selectedToolForViewing.name}
          description={selectedToolForViewing.description}
        />
      )}
    </div>
  );
};
