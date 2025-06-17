import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Target,
  Wrench,
  Scissors,
  ArrowDown,
} from "lucide-react";
import { UIMessage } from "ai";

interface ReviewStepProps {
  name: string;
  description: string;
  naturalLanguageCriteria: string[];
  expectedToolCalls: string[];
  messages: UIMessage[];
  cutPosition: number;
  datasetName: string;
}

export function ReviewStep({
  name,
  description,
  naturalLanguageCriteria,
  expectedToolCalls,
  messages,
  cutPosition,
  datasetName,
}: ReviewStepProps) {
  const inputMessages = messages.slice(0, cutPosition);
  const outputMessages = messages.slice(cutPosition);

  const getMessageSummary = (message: UIMessage, maxLength: number = 60) => {
    const textParts =
      message.parts?.filter((part) => part.type === "text") || [];
    const toolParts =
      message.parts?.filter((part) => part.type === "tool-invocation") || [];

    let summary = "";

    // Add text content
    if (textParts.length > 0) {
      const textContent = textParts.map((part) => part.text).join("");
      const firstLine = textContent.split("\n")[0];
      summary =
        firstLine.length > maxLength
          ? firstLine.substring(0, maxLength) + "..."
          : firstLine;
    }

    // Add tool calls
    if (toolParts.length > 0) {
      const toolSummary = `[${toolParts.length} tool call(s)]`;
      summary = summary ? `${summary} ${toolSummary}` : toolSummary;
    }

    return summary || "[No content]";
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Review your dataset item configuration before creating it.
      </p>

      <div className="space-y-6">
        {/* Basic Info Review */}
        <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <MessageSquare className="h-4 w-4" />
            Basic Information
          </h4>
          <div className="bg-background space-y-2 rounded-md border p-3">
            <div className="flex gap-2 font-mono text-xs leading-relaxed">
              <span className="text-primary flex-shrink-0">Dataset:</span>
              <span className="text-muted-foreground min-w-0 flex-1">
                {datasetName}
              </span>
            </div>
            <div className="flex gap-2 font-mono text-xs leading-relaxed">
              <span className="text-primary flex-shrink-0">Name:</span>
              <span className="text-muted-foreground min-w-0 flex-1">
                {name}
              </span>
            </div>
            {description && (
              <div className="flex gap-2 font-mono text-xs leading-relaxed">
                <span className="text-primary flex-shrink-0">Description:</span>
                <span className="text-muted-foreground min-w-0 flex-1">
                  {description}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conversation Structure */}
        <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Scissors className="h-4 w-4" />
            Conversation Structure
          </h4>
          <div className="space-y-3">
            {/* Input Messages */}
            {inputMessages.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Input ({inputMessages.length} messages)
                </Label>
                <div className="bg-background space-y-1 rounded-md border p-3">
                  {inputMessages.map((msg, index) => (
                    <div
                      key={index}
                      className="flex gap-2 font-mono text-xs leading-relaxed"
                    >
                      <span
                        className={`flex-shrink-0 ${
                          msg.role === "user"
                            ? "text-blue-600 dark:text-blue-400"
                            : msg.role === "assistant"
                              ? "text-green-600 dark:text-green-400"
                              : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {msg.role}:
                      </span>
                      <span className="text-muted-foreground min-w-0 flex-1">
                        {getMessageSummary(msg)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cut Indicator */}
            <div className="flex items-center gap-2 py-1">
              <div className="bg-primary/20 text-primary flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
                <Scissors className="h-3 w-3" />
                Cut Position
              </div>
              <ArrowDown className="text-primary h-4 w-4" />
            </div>

            {/* Output Messages */}
            {outputMessages.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Output ({outputMessages.length} messages)
                </Label>
                <div className="bg-background space-y-1 rounded-md border p-3">
                  {outputMessages.map((msg, index) => (
                    <div
                      key={index}
                      className="flex gap-2 font-mono text-xs leading-relaxed"
                    >
                      <span
                        className={`flex-shrink-0 ${
                          msg.role === "user"
                            ? "text-blue-600 dark:text-blue-400"
                            : msg.role === "assistant"
                              ? "text-green-600 dark:text-green-400"
                              : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {msg.role}:
                      </span>
                      <span className="text-muted-foreground min-w-0 flex-1">
                        {getMessageSummary(msg)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-background rounded-md border p-3">
                <p className="text-muted-foreground font-mono text-xs">
                  No output messages (cut at end of conversation)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Test Criteria Review */}
        <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4" />
            Success Criteria ({naturalLanguageCriteria.length})
          </h4>
          {naturalLanguageCriteria.length === 0 ? (
            <Badge variant="secondary">None defined</Badge>
          ) : (
            <div className="bg-background space-y-1 rounded-md border p-3">
              {naturalLanguageCriteria.map((criterion, index) => (
                <div
                  key={index}
                  className="flex gap-2 font-mono text-xs leading-relaxed"
                >
                  <span className="text-primary flex-shrink-0">
                    {index + 1}:
                  </span>
                  <span className="text-muted-foreground min-w-0 flex-1">
                    {criterion}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expected Tools Review */}
        {expectedToolCalls.length > 0 && (
          <div className="bg-muted/30 space-y-3 rounded-lg border p-4">
            <h4 className="flex items-center gap-2 font-semibold">
              <Wrench className="h-4 w-4" />
              Expected Tool Calls ({expectedToolCalls.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {expectedToolCalls.map((toolName) => (
                <Badge key={toolName} variant="secondary">
                  {toolName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
