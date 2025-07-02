import React from "react";
import { MessageComponent } from "./Message";
import { Message } from "ai";

interface MessagesListProps {
  latestUserMessageRef?: React.RefObject<HTMLDivElement | null>;
  placeholderHeight: number;
  messages: Message[];
}

export function MessagesList({
  latestUserMessageRef,
  messages,
  placeholderHeight,
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
          isLatestUserMessage={index === latestUserMessageIndex}
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
