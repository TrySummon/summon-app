import React from "react";
import { Prompt } from "@modelcontextprotocol/sdk/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Zap } from "lucide-react";

interface PromptsListProps {
  prompts: Prompt[];
}

export const PromptsList: React.FC<PromptsListProps> = ({ prompts }) => {
  if (prompts.length === 0) {
    return (
      <div className="w-full py-6 text-center">
        <p className="mb-1 text-sm font-medium">This MCP has no prompts.</p>
        <p className="text-muted-foreground text-xs">
          Prompts are reusable templates and workflows that can be used to guide
          LLM interactions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">MCP Prompts ({prompts.length})</h2>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {prompts.map((prompt, index) => (
          <AccordionItem key={prompt.name} value={`prompt-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium">{prompt.name}</span>
                </div>
                {prompt.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm font-normal">
                    {prompt.description}
                  </p>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 rounded-md border p-4">
                {/* Display prompt arguments */}
                {prompt.arguments && prompt.arguments.length > 0 ? (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Arguments</h4>
                    <div className="space-y-3">
                      {prompt.arguments.map((arg, idx) => (
                        <div key={idx}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-foreground font-mono text-xs font-semibold">
                              {arg.name}
                            </span>
                            {arg.required && (
                              <Badge
                                variant="outline"
                                className="border-red-500/50 bg-red-500/10 font-mono text-xs text-red-500"
                              >
                                required
                              </Badge>
                            )}
                          </div>
                          {arg.description && (
                            <p className="text-muted-foreground mb-2 text-xs">
                              {arg.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This prompt has no arguments.
                  </p>
                )}

                <div className="border-t pt-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <Zap className="h-3 w-3" />
                    <span>Ready to use in conversations</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
