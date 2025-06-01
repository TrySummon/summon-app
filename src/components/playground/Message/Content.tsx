import React, { useCallback, useRef, useEffect } from "react";
import ImageEditor from "@/components/ImageEditor";
import { Attachment, UIMessage } from "ai";
import MessageEditor from "./Editor";
import { ToolCall } from "./ToolCall";

interface Props {
  message: UIMessage;
  onChange?: (message: UIMessage) => void;
  autoFocus?: boolean;
  maxHeight?: number;
}

export function MessageContent({
  message,
  onChange,
  autoFocus,
  maxHeight
}: Props) {
  const placeholder = autoFocus ? 'Type your message here. Shift+Enter for new line.' : 'Empty';
  
  const messageRef = useRef<UIMessage>(message);
  
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  const onPasteImage = useCallback(
    (url: string, contentType: string) => {
      const toAdd: Attachment = { url, contentType };
      // Use the ref to get the latest message value
      onChange?.({
        ...messageRef.current,
        experimental_attachments: [...(messageRef.current.experimental_attachments || []), toAdd]
      });
    },
    [onChange]
  );

    return (
      <div className="flex flex-col gap-2">
        {message.parts.map((c, i) => {
          if (c.type === 'text') {
            return (
              <div className="flex" key={i}>
                <MessageEditor
                  autoFocus={autoFocus}
                  maxHeight={maxHeight}
                  readOnly={!onChange}
                  value={c.text}
                  onPasteImage={onPasteImage}
                  onChange={(v) =>
                    onChange?.({
                      ...messageRef.current,
                      parts: messageRef.current.parts.map((c, changedIndex) => {
                        if (i !== changedIndex) {
                          return c;
                        } else {
                          return { ...c, text: v };
                        }
                      }),
                    })
                  }
                  placeholder={placeholder}
                />
              </div>
            );
          }
          if(c.type === 'tool-invocation') {
            return (
              <ToolCall
              key={i}
                invocation={c.toolInvocation}
              />
            );
          }
        })}
        <div className="flex items-center gap-2">
          {message.experimental_attachments?.map((a, i) => (
            <ImageEditor
              key={i}
              url={a.url}
              onDelete={() =>
                onChange?.({
                  ...message,
                  experimental_attachments: message.experimental_attachments?.filter((_, deletedIndex) => i !== deletedIndex)
                })
              }
            />
          ))}
        </div>
      </div>
    );
}
