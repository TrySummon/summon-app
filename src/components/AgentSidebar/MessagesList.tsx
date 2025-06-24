import React from "react";
import { Message } from "ai";
import { MessageComponent } from "./Message";

interface MessagesListProps {
  messages: Message[];
  isRunning?: boolean;
  latestUserMessageRef?: React.RefObject<HTMLDivElement | null>;
  placeholderHeight?: number;
}

export function MessagesList({
  messages,
  isRunning,
  latestUserMessageRef,
  placeholderHeight = 0,
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
