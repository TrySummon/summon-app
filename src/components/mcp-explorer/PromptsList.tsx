import React, { useState } from "react";
import { Prompt } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { UsePromptDialog } from "./UsePromptDialog";

interface PromptsListProps {
  prompts: Prompt[];
  mcpId: string;
}

export const PromptsList: React.FC<PromptsListProps> = ({ prompts, mcpId }) => {
  const [usePromptDialogOpen, setUsePromptDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  if (prompts.length === 0) {
    return (
      <div className="w-full py-6 text-center">
        <p className="mb-1 text-sm font-medium">This MCP has no prompts.</p>
        <p className="text-muted-foreground text-xs">
          Prompts are reusable templates that can be used with LLMs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {prompts.map((prompt, index) => (
          <AccordionItem key={prompt.name} value={`prompt-${index}`}>
            <AccordionTrigger className="group hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{prompt.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPrompt(prompt);
                        setUsePromptDialogOpen(true);
                      }}
                      title="Use prompt"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
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
                {/* Display prompt arguments details */}
                {prompt.arguments && prompt.arguments.length > 0 ? (
                  <div>
                    <h4 className="mb-3 text-sm font-medium">Arguments:</h4>
                    <div className="space-y-4">
                      {prompt.arguments.map((arg, idx) => (
                        <div key={idx}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-foreground font-mono text-xs font-semibold">
                              {arg.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground font-mono text-xs"
                            >
                              string
                            </Badge>
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

      <UsePromptDialog
        prompt={selectedPrompt}
        mcpId={mcpId}
        open={usePromptDialogOpen}
        onOpenChange={setUsePromptDialogOpen}
      />
    </div>
  );
};
