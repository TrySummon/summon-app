import React from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { extractToolParameters } from "./utils";
import { JsonSchema } from "../json-schema";
import { AddEndpointsButton } from "./AddEndpointsButton";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";

const getTokenCountBadgeVariant = (count: number) => {
  if (count < 500) return "text-green-600 dark:text-green-400";
  if (count < 1000) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

interface ToolsListProps {
  tools: Tool[];
  onDeleteTool?: (toolName: string) => void;
  onDeleteAllTools?: () => void;
  onAddEndpoints?: (apiId: string, tools: SelectedEndpoint[]) => void;
}

export const ToolsList: React.FC<ToolsListProps> = ({
  tools,
  onDeleteTool,
  onDeleteAllTools,
  onAddEndpoints,
}) => {
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
          <AccordionItem key={tool.name} value={`tool-${index}`}>
            <AccordionTrigger className="group hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tool.name}</span>
                  {tool.annotations?.tokenCount ? (
                    <div
                      className={`font-mono text-xs ${getTokenCountBadgeVariant(tool.annotations.tokenCount as number)}`}
                    >
                      {tool.annotations.tokenCount as number} tks
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
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
                        <Trash2 className="h-4 w-4" />
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
    </div>
  );
};
