import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface PromptsListProps {
  prompts: Prompt[];
}

export const PromptsList: React.FC<PromptsListProps> = ({ prompts }) => {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Available MCP Prompts</h2>
        <p className="text-muted-foreground text-sm">
          Expand a prompt to view its details and arguments
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {prompts.map((prompt, index) => (
          <AccordionItem key={prompt.name} value={`prompt-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full flex-col items-start gap-1 text-left">
                <span className="font-medium">{prompt.name}</span>
                {prompt.description && (
                  <p className="text-muted-foreground text-sm font-normal">
                    {prompt.description}
                  </p>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 rounded-md border p-4">
                {prompt.arguments && prompt.arguments.length > 0 ? (
                  <div>
                    <h4 className="mb-2 font-semibold">Arguments:</h4>
                    <div className="space-y-4">
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
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
