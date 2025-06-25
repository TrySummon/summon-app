import React, { useState, useEffect, forwardRef, useMemo } from "react";
import { Message, TextPart } from "ai";
import { cn } from "@/utils/tailwind";
import { Markdown } from "@/components/Markdown";
import { Brain, Square, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Loader } from "../Loader";
import { AttachmentsDisplay } from "./AttachmentsDisplay";
import { EditableMessageEditor } from "./EditableMessageEditor";
import { extractMentions } from "./mentionUtils";
import { ToolInvocation } from "./ToolInvocation";
import { useAgentContext } from "./AgentContext";

interface MessageComponentProps {
  message: Message;
  isLatestUserMessage?: boolean;
}

// Not exported from ai
type ReasoningUIPart = {
  type: "reasoning";
  /**
   * The reasoning text.
   */
  reasoning: string;
  details: Array<
    | {
        type: "text";
        text: string;
        signature?: string;
      }
    | {
        type: "redacted";
        data: string;
      }
  >;
};

export const MessageComponent = forwardRef<
  HTMLDivElement,
  MessageComponentProps
>(({ message, isLatestUserMessage }, ref) => {
  const { isRunning, onStopAgent, onRevert, onUpdateMessage, mentionData } =
    useAgentContext();
  const [showReasoning, setShowReasoning] = useState<Record<number, boolean>>(
    {},
  );
  const [isEditing, setIsEditing] = useState(false);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const isSystem = message.role === "system";

  // Get all parts in their natural order
  const parts = message.parts || [];

  // Extract mentions for user messages
  const userMentions = useMemo(() => {
    if (!isUser || !message.content || !mentionData) return [];
    return extractMentions(message.content, mentionData);
  }, [isUser, message.content, mentionData]);

  const userAttachments = useMemo(() => {
    return message.experimental_attachments || [];
  }, [message.experimental_attachments]);

  const handleEditMessage = () => {
    if (!isRunning) {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = (updatedMessage: Message) => {
    if (onUpdateMessage) {
      onUpdateMessage(updatedMessage);
      setIsEditing(false);
    }
  };

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

  // Don't render system messages
  if (isSystem) {
    return null;
  }

  const toggleReasoning = (partIndex: number) => {
    setShowReasoning((prev) => ({
      ...prev,
      [partIndex]: !prev[partIndex],
    }));
  };

  const renderReasoningPart = (part: ReasoningUIPart, partIndex: number) => {
    const isThinking = isThinkingPart(partIndex);
    const isShowing = showReasoning[partIndex] ?? false;

    return (
      <div key={partIndex} className="max-w-full">
        <div
          className="group/reasoning flex cursor-pointer items-center justify-between rounded-lg"
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
                <Markdown mentionData={mentionData}>
                  {part.details && Array.isArray(part.details)
                    ? part.details
                        .map((detail: { type: string; text?: string }) =>
                          detail.type === "text"
                            ? String(detail.text || "")
                            : "<redacted>",
                        )
                        .join("")
                    : ""}
                </Markdown>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTextPart = (part: TextPart, partIndex: number) => {
    return (
      <div
        key={partIndex}
        className={cn("w-full break-words", isUser && "p-2")}
      >
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isUser ? "prose-neutral" : "",
          )}
        >
          <div>
            <Markdown mentionData={mentionData}>
              {part.text ? String(part.text) : ""}
            </Markdown>
          </div>
        </div>
      </div>
    );
  };

  const renderUserMessage = () => {
    if (isEditing) {
      return (
        <EditableMessageEditor
          message={message}
          mentionData={mentionData}
          onUpdateMessage={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      );
    }

    return (
      <div
        className={cn("p-3", !isRunning ? "cursor-pointer" : "cursor-default")}
        onClick={handleEditMessage}
        title={!isRunning ? "Click to edit" : undefined}
      >
        {/* Show mentions and attachments */}
        <AttachmentsDisplay
          mentions={userMentions}
          attachments={userAttachments}
          editable={false}
        />

        {/* Message content */}
        <div>
          <Markdown mentionData={mentionData}>{message.content || ""}</Markdown>
        </div>
      </div>
    );
  };

  const renderMessageParts = () => {
    return parts.map((part, partIndex) => {
      if (part.type === "reasoning" && isAssistant) {
        return renderReasoningPart(part, partIndex);
      } else if (part.type === "text") {
        return renderTextPart(part, partIndex);
      } else if (part.type === "tool-invocation" && isAssistant) {
        return (
          <ToolInvocation
            key={partIndex}
            toolInvocation={part.toolInvocation}
          />
        );
      }
      return null;
    });
  };

  const renderActionBar = () => {
    if (!isUser || isEditing) {
      return null;
    }

    // Show running status and stop button only on latest user message
    const showRunningStatus = isLatestUserMessage && isRunning;
    const showStopButton = isLatestUserMessage && isRunning && onStopAgent;

    // Show revert button logic:
    // - When running: only on non-latest messages (disabled)
    // - When not running: on all messages (enabled)
    const showRevertButton = message.id && (!isRunning || !isLatestUserMessage);
    const isRevertDisabled = isRunning && !isLatestUserMessage;

    return (
      <div className="flex items-center justify-between border-t px-3 py-1">
        <div className="flex items-center gap-2">
          {showRunningStatus && (
            <>
              <Loader />
              <span className="text-muted-foreground text-xs">Running...</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showStopButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStopAgent}
              className="h-7 gap-1.5 px-2"
            >
              <Square className="h-3 w-3 fill-current" />
              <span className="text-xs">Stop</span>
            </Button>
          )}
          {showRevertButton && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isRevertDisabled}
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to revert to the previous MCP state?",
                  )
                ) {
                  onRevert(message.id!);
                }
              }}
              className="h-7 gap-1.5 px-2"
            >
              <Undo className="h-3 w-3" />
              <span className="text-xs">Revert</span>
            </Button>
          )}
        </div>
      </div>
    );
  };

  const getMessageContainerStyles = () => {
    return cn(
      "group flex flex-col",
      isUser
        ? "dark:bg-sidebar-accent/20 bg-card/20 rounded-lg border hover:bg-card/80 dark:hover:bg-sidebar-accent/80  transition-colors duration-200"
        : "text-foreground border-transparent bg-transparent",
    );
  };

  return (
    <div className={getMessageContainerStyles()} ref={ref}>
      <div className="flex flex-col gap-3">
        {isUser ? renderUserMessage() : renderMessageParts()}
      </div>
      {renderActionBar()}
    </div>
  );
});

MessageComponent.displayName = "MessageComponent";
