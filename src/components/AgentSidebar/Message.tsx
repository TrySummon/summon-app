import React, { useState, useEffect, forwardRef } from "react";
import { Message } from "ai";
import { cn } from "@/utils/tailwind";
import { Markdown } from "@/components/Markdown";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "../ui/separator";
import { Loader } from "../Loader";

interface MessageComponentProps {
  message: Message;
  isRunning?: boolean;
}

export const MessageComponent = forwardRef<
  HTMLDivElement,
  MessageComponentProps
>(({ message, isRunning }, ref) => {
  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>(
    {},
  );

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";

  // Get all parts in their natural order
  const parts = message.parts || [];

  // Helper function to determine if a reasoning part is currently being thought
  const isThinkingPart = (partIndex: number) => {
    if (!isRunning) return false;
    const part = parts[partIndex];
    if (part?.type !== "reasoning") return false;
    // Check if this is the last part of the message
    return partIndex === parts.length - 1;
  };

  // Auto-show reasoning when thinking starts for a part
  useEffect(() => {
    parts.forEach((part, index) => {
      if (part.type === "reasoning" && isThinkingPart(index)) {
        setShowReasoning((prev) => ({ ...prev, [index]: true }));
      }
    });
  }, [isRunning, parts.length]);

  // Auto-close reasoning when thinking is done for a part
  useEffect(() => {
    setShowReasoning((prev) => {
      const newState = { ...prev };

      // Check each reasoning part that was previously shown
      Object.keys(prev).forEach((indexStr) => {
        const index = parseInt(indexStr);
        const part = parts[index];

        // If this was a reasoning part that's no longer thinking, close it
        if (
          part?.type === "reasoning" &&
          prev[index] &&
          !isThinkingPart(index)
        ) {
          newState[index] = false;
        }
      });

      return newState;
    });
  }, [isRunning, parts.length]);

  const toggleReasoning = (partIndex: number) => {
    setShowReasoning((prev) => ({
      ...prev,
      [partIndex]: !prev[partIndex],
    }));
  };

  if (isSystem) {
    return null;
  }

  return (
    <div
      className={cn(
        "group flex flex-col gap-3",
        isUser
          ? "bg-card/40 rounded-lg border"
          : "text-foreground border-transparent bg-transparent",
      )}
      ref={ref}
    >
      {/* Render parts in their natural order */}
      {parts.map((part, partIndex) => {
        if (part.type === "reasoning" && isAssistant) {
          const isThinking = isThinkingPart(partIndex);
          const isShowing = showReasoning[partIndex] ?? false;

          return (
            <div key={partIndex} className="max-w-full">
              <div
                className={cn(
                  "group/reasoning flex cursor-pointer items-center justify-between rounded-lg",
                )}
                onClick={() => toggleReasoning(partIndex)}
              >
                <div
                  className={cn(
                    "text-muted-foreground flex items-center gap-2",
                    isThinking && "animate-pulse",
                  )}
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {isThinking ? "Thinking" : "Finished thinking"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 transition-opacity group-hover/reasoning:opacity-100"
                >
                  {isShowing ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {isShowing && (
                <div className="mt-2 rounded-lg pl-5.5">
                  <div className="text-muted-foreground space-y-2 text-xs">
                    <div>
                      <Markdown textSize="base">
                        {"details" in part && Array.isArray(part.details)
                          ? part.details
                              .map((detail) =>
                                detail.type === "text"
                                  ? String(detail.text || "")
                                  : "<redacted>",
                              )
                              .join("")
                          : "text" in part
                            ? String(part.text || "")
                            : "<reasoning>"}
                      </Markdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        } else if (part.type === "text") {
          return (
            <div
              key={partIndex}
              className={cn("w-full break-words", isUser && "p-3")}
            >
              {/* Text Content */}
              <div
                className={cn(
                  "prose prose-sm max-w-none",
                  isUser ? "prose-neutral" : "",
                )}
              >
                <div>
                  <Markdown textSize="base">
                    {"text" in part ? String(part.text || "") : ""}
                  </Markdown>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
      {isUser && (
        <>
          <Separator />
          <div className="flex px-3 pb-3">
            {isRunning && ref ? <Loader /> : null}
          </div>
        </>
      )}
    </div>
  );
});

MessageComponent.displayName = "MessageComponent";
