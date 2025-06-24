import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Prompt } from "@/types/mcp";

interface PromptItemProps {
  prompt: Prompt;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
}

export default function PromptItem({
  prompt,
  mcpId,
  isSelected,
  onToggle,
}: PromptItemProps) {
  const hasArguments = prompt.arguments && prompt.arguments.length > 0;

  return (
    <div key={mcpId + prompt.name} className="group/prompt relative border-b">
      <div className="p-2 py-4">
        <div className="flex items-start justify-between">
          <div
            className="flex flex-1 cursor-pointer items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Checkbox checked={isSelected} />
            <div className="flex flex-1 items-center gap-2">
              <Label
                title={prompt.name}
                className="text-foreground cursor-pointer text-sm font-normal"
              >
                {prompt.name}
              </Label>
              {hasArguments && (
                <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-xs">
                  {prompt.arguments?.length} arg
                  {(prompt.arguments?.length || 0) !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
        {prompt.description && (
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <p className="text-muted-foreground/80 mt-1 ml-6 line-clamp-2 text-xs leading-relaxed">
                {prompt.description}
              </p>
            </HoverCardTrigger>
            <HoverCardContent
              side="left"
              sideOffset={28}
              align="center"
              className="w-80 p-4"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{prompt.name}</h4>
                <p className="text-xs">{prompt.description}</p>
                {hasArguments && (
                  <div className="space-y-1">
                    <h5 className="text-xs font-medium">Arguments:</h5>
                    <ul className="space-y-0.5 text-xs">
                      {prompt.arguments?.map((arg, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <code className="bg-secondary rounded px-1 py-0.5 text-xs">
                            {arg.name}
                          </code>
                          {arg.required && (
                            <span className="text-destructive text-xs">
                              required
                            </span>
                          )}
                          {arg.description && (
                            <span className="text-muted-foreground text-xs">
                              - {arg.description}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
}
