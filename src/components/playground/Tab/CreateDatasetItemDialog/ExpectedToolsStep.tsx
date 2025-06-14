import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/utils/tailwind";
import { UIMessage } from "ai";

interface Tool {
  name: string;
  mcpName: string;
  description?: string;
}

interface ExpectedToolsStepProps {
  expectedToolCalls: string[];
  setExpectedToolCalls: (toolCalls: string[]) => void;
  detectedToolCalls: string[];
  allAvailableTools: Tool[];
  cutPosition: number;
  messages: UIMessage[];
}

export function ExpectedToolsStep({
  expectedToolCalls,
  setExpectedToolCalls,
  detectedToolCalls,
  allAvailableTools,
  cutPosition,
  messages,
}: ExpectedToolsStepProps) {
  const [toolSearchQuery, setToolSearchQuery] = useState("");

  // Check if cut position is at the end (no output messages to evaluate)
  const isAtEnd = cutPosition >= messages.length;

  // Filter tools based on search
  const filteredAvailableTools = useMemo(() => {
    if (!toolSearchQuery.trim()) return allAvailableTools;

    const query = toolSearchQuery.toLowerCase();
    return allAvailableTools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description?.toLowerCase().includes(query) ||
        tool.mcpName.toLowerCase().includes(query),
    );
  }, [allAvailableTools, toolSearchQuery]);

  const handleToggleToolCall = (toolName: string) => {
    if (isAtEnd) return; // Prevent changes when at end

    setExpectedToolCalls(
      expectedToolCalls.includes(toolName)
        ? expectedToolCalls.filter((name) => name !== toolName)
        : [...expectedToolCalls, toolName],
    );
  };

  // Show warning when at end
  if (isAtEnd) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                No Output to Evaluate
              </h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Expected tool calls cannot be defined because the cut position
                is at the end of the conversation. There are no assistant
                responses after the cut to validate tool usage against.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Select tools that should be called when evaluating this dataset item.
        We've pre-selected tools detected from all messages in this tab.
      </p>

      {/* Detected Tools */}
      {detectedToolCalls.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base font-medium">
            Detected from Tab Messages
          </Label>
          <div className="flex flex-wrap gap-2">
            {detectedToolCalls.map((toolName) => (
              <Badge
                key={toolName}
                variant={
                  expectedToolCalls.includes(toolName) ? "default" : "outline"
                }
                className="cursor-pointer px-3 py-1 text-sm hover:opacity-80"
                onClick={() => handleToggleToolCall(toolName)}
              >
                {expectedToolCalls.includes(toolName) && (
                  <Check className="mr-1 h-3 w-3" />
                )}
                {toolName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {detectedToolCalls.length > 0 && <Separator />}

      {/* Available Tools */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">All Available Tools</Label>
          <Badge variant="outline" className="text-xs">
            {allAvailableTools.length} total
          </Badge>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={toolSearchQuery}
            onChange={(e) => setToolSearchQuery(e.target.value)}
            placeholder="Search available tools..."
            className="h-11 pl-10"
          />
        </div>

        <div className="space-y-2">
          {filteredAvailableTools.map((tool) => {
            const isSelected = expectedToolCalls.includes(tool.name);
            const isDetected = detectedToolCalls.includes(tool.name);

            return (
              <div
                key={tool.name}
                onClick={() => handleToggleToolCall(tool.name)}
                className={cn(
                  "hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  isSelected && "bg-primary/10 border-primary/20",
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tool.name}</span>
                    {isDetected && (
                      <Badge variant="secondary" className="text-xs">
                        Detected
                      </Badge>
                    )}
                    {isSelected && <Check className="text-primary h-4 w-4" />}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    from {tool.mcpName}
                  </div>
                  {tool.description && (
                    <div className="text-muted-foreground line-clamp-2 text-sm">
                      {tool.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredAvailableTools.length === 0 && toolSearchQuery && (
            <div className="text-muted-foreground py-12 text-center">
              No tools found matching "{toolSearchQuery}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
