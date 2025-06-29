import React, { useState } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Play } from "lucide-react";
import { extractToolParameters } from "./utils";
import { JsonSchema } from "../json-schema";
import { AddEndpointsButton } from "./AddEndpointsButton";
import { CallToolDialog } from "./CallToolDialog";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { useToolAnimations } from "@/hooks/useToolAnimations";

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
    const savings = originalCount - optimisedCount;
    const savingsPercentage = Math.round((savings / originalCount) * 100);
    return {
      displayCount: optimisedCount,
      text: `${optimisedCount} tks (-${savingsPercentage}%)`,
      isOptimised: true,
    };
  }

  return {
    displayCount: originalCount,
    text: `${originalCount} tks`,
    isOptimised: false,
  };
};

interface ToolsListProps {
  tools: Tool[];
  mcpId: string;
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
}) => {
  const [callToolDialogOpen, setCallToolDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const { getAnimationClasses } = useToolAnimations({ mcpId });
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">MCP Tools ({tools.length})</h2>
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
        {tools.map((tool, index) => (
          <AccordionItem
            key={tool.name}
            value={`tool-${index}`}
            className={getAnimationClasses(tool.name)}
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
                        <div
                          className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-xs text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"
                          title={`Optimised from ${tool.annotations?.tokenCount} tokens`}
                        >
                          {tokenInfo.text}
                        </div>
                      );
                    }

                    return (
                      <div
                        className={`font-mono text-xs ${getTokenCountBadgeVariant(tokenInfo.displayCount)}`}
                      >
                        {tokenInfo.text}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTool(tool);
                        setCallToolDialogOpen(true);
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
                            onDeleteTool(tool.name);
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
                                  Object.keys(param.properties).length >
                                    0)) && (
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
        ))}
      </Accordion>

      <CallToolDialog
        tool={selectedTool}
        mcpId={mcpId}
        open={callToolDialogOpen}
        onOpenChange={setCallToolDialogOpen}
      />
    </div>
  );
};
