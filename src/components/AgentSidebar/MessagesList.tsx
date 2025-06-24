import React from "react";
import { Message } from "ai";
import { MessageComponent } from "./Message";
import { MentionData } from "./index";

interface MessagesListProps {
  messages: Message[];
  isRunning?: boolean;
  latestUserMessageRef?: React.RefObject<HTMLDivElement | null>;
  placeholderHeight?: number;
  onStop?: () => void;
  onRevert?: (messageId: string) => void;
  onUpdateMessage?: (message: Message) => void;
  mentionData: MentionData[];
}

export function MessagesList({
  messages,
  isRunning,
  latestUserMessageRef,
  placeholderHeight = 0,
  onStop,
  onRevert,
  onUpdateMessage,
  mentionData,
}: MessagesListProps) {
  if (messages.length === 0) {
    return null;
  }

  // Find the index of the latest user message
  const latestUserMessageIndex = messages.findLastIndex(
    (msg) => msg.role === "user",
  );

  return (
    <div className="flex flex-col gap-4 pb-4 text-base">
      {messages.map((message, index) => (
        <MessageComponent
          key={message.id || index}
          message={message}
          isRunning={isRunning}
          isLatestUserMessage={index === latestUserMessageIndex}
          onStop={onStop}
          onRevert={onRevert}
          onUpdateMessage={onUpdateMessage}
          mentionData={mentionData}
          ref={
            index === latestUserMessageIndex ? latestUserMessageRef : undefined
          }
        />
      ))}
      {/* Dynamic placeholder to ensure scroll space */}
      {placeholderHeight > 0 && (
        <div
          style={{ height: placeholderHeight }}
          className="flex-shrink-0"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
