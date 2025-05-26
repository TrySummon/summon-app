import React from "react";
import { Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import ImageEditor from "@/components/ImageEditor";
import { Button } from "@/components/ui/button";
import { Attachment, UIMessage } from "ai";
import MessageEditor from "./Editor";
import { ToolCall } from "./ToolCall";

interface Props {
  parts: UIMessage["parts"];
  attachments?: UIMessage["experimental_attachments"];
  onChange?: (content: UIMessage["parts"], attachments?: UIMessage["experimental_attachments"]) => void;
  autoFocus?: boolean;
  maxHeight?: number;
}

export function MessageContent({
  parts,
  attachments,
  onChange,
  autoFocus,
  maxHeight
}: Props) {
  const placeholder = autoFocus ? 'Type your message here.' : 'Empty';
  const addImage = useCallback(
    (url: string) => {
      const toAdd: Attachment = { url };
      onChange?.(parts, [...(attachments || []), toAdd]);
    },
    [parts, attachments, onChange]
  );

    return (
      <div className="flex flex-col gap-2">
        {parts.map((c, i) => {
          if (c.type === 'text') {
            return (
              <div className="flex" key={i}>
                <MessageEditor
                  autoFocus={autoFocus}
                  key={i}
                  maxHeight={maxHeight}
                  readOnly={!onChange}
                  value={c.text}
                  onPasteImage={addImage}
                  onChange={(v) =>
                    onChange?.(
                      parts.map((c, changedIndex) => {
                        if (i !== changedIndex) {
                          return c;
                        } else {
                          return { ...c, text: v };
                        }
                      })
                    )
                  }
                  placeholder={placeholder}
                />
                {i !== 0 ? (
                  <Button
                    onClick={() =>
                      onChange?.(
                        parts.filter((_, deletedIndex) => i !== deletedIndex)
                      )
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
        {attachments?.map((a, i) => (
          <ImageEditor
            key={i}
            url={a.url}
            onDelete={() =>
              onChange?.(
                parts,
                attachments?.filter((_, deletedIndex) => i !== deletedIndex)
              )
            }
          />
        ))}
      </div>
    );
}
