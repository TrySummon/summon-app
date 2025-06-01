import React from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { extractToolParameters } from "./utils";
import { JsonSchema } from "../json-schema";

interface ToolsListProps {
  tools: Tool[];
}

export const ToolsList: React.FC<ToolsListProps> = ({ tools }) => {
  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Available MCP Tools</h2>
        <p className="text-muted-foreground text-sm">Expand a tool to view its details and parameters</p>
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {tools.map((tool, index) => (
          <AccordionItem key={tool.name} value={`tool-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left w-full">
                <span className="font-medium">{tool.name}</span>
                {tool.description && (
                  <p className="text-sm text-muted-foreground font-normal">{tool.description}</p>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 border rounded-md p-4">
                {/* Display tool schema details */}
                {tool.inputSchema && tool.inputSchema.properties && Object.keys(tool.inputSchema.properties).length > 0 ? (
                  <div>
                    <div className="space-y-4">
                      {extractToolParameters(tool).map((param, idx) => (
                        <div key={idx}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs font-semibold text-foreground">{param.name}</span>
                            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                              {param.type}
                            </Badge>
                            {param.required && (
                              <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
                                required
                              </Badge>
                            )}
                            {param.schema && (param.type === 'object' || (param.properties && Object.keys(param.properties).length > 0)) && (
                              <div className="ml-auto">
                                <JsonSchema schema={param.schema} name={param.name} />
                              </div>
                            )}
                          </div>
                          
                          {param.description && (
                            <p className="text-xs text-muted-foreground mb-2">{param.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">This tool has no parameters.</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
