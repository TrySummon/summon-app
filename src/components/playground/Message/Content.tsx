import React from "react";
import { Trash2 } from 'lucide-react';
import ImageEditor from "@/components/ImageEditor";
import { Button } from "@/components/ui/button";
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
                  onPasteImage={(url, contentType) => {
                    const toAdd: Attachment = { url, contentType };
                    onChange?.({
                      ...message,
                      experimental_attachments: [...(message.experimental_attachments || []), toAdd]
                    });
                  }}
                  onChange={(v) =>
                    onChange?.({
                      ...message,
                      parts: message.parts.map((c, changedIndex) => {
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
                {i !== 0 ? (
                  <Button
                    onClick={() =>
                      onChange?.({
                        ...message,
                        parts: message.parts.filter((_, deletedIndex) => i !== deletedIndex),
                        experimental_attachments: message.experimental_attachments?.filter((_, deletedIndex) => i !== deletedIndex)
                      })
                    }
                    className="-mt-2 -mr-2 text-muted-foreground"
                    variant="ghost"
                    size="icon"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
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
