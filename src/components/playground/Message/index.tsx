import React, { useState } from "react";
import { MessageContent } from './Content';
import RoleSelect from './RoleSelect';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { ListPlusIcon, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import ImageDialog from "@/components/ImageDialog";
import { Attachment, UIMessage } from "ai";


interface Props {
  message: UIMessage;
  autoFocus?: boolean;
  onChange?: (message: UIMessage) => void;
  onDelete?: () => void;
  maxHeight?: number;
  children?: React.ReactNode;
}

export default function Message({
  message,
  onChange,
  onDelete,
  autoFocus,
  maxHeight,
  children
}: Props) {
  const addText = useCallback(() => {
    const toAdd = { type: 'text' as const, text: '' };
    if (typeof message.content === 'string') {
      onChange?.({
        ...message,
        parts: [
          {
            type: 'text',
            text: message.content as string
          },
          toAdd
        ]
      });
    } else {
      onChange?.({
        ...message,
        parts: [...(message.parts || []), toAdd]
      });
    }
  }, [message.content, onChange]);

  const addImage = useCallback(
    (url: string, mimeType: string) => {
      const toAdd: Attachment = { url, contentType: mimeType };
      onChange?.({
        ...message,
        experimental_attachments: [...(message.experimental_attachments || []), toAdd]
      });
    },
    [message, onChange]
  );

  const [isHovering, setIsHovering] = useState(false);

  // Determine if buttons should be visible based on autoFocus and hover state
  const showButtons = autoFocus || isHovering;

  return (
    <div 
      className="flex flex-col gap-1"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <RoleSelect
            disabled={!onChange}
            value={message.role}
            onValueChange={(v) => {
              onChange?.({
                ...message,
                role: v
              });
            }}
          />
        </div>

        {onChange ? (
          <TooltipProvider delayDuration={100}>
            <div 
              className={`flex -mr-2 transition-opacity duration-150 ${showButtons ? 'opacity-100' : 'opacity-0'}`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="text-muted-foreground"
                    onClick={addText}
                    variant="ghost"
                    size="icon"
                  >
                    <ListPlusIcon size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add Text Block</p>
                </TooltipContent>
              </Tooltip>
              <ImageDialog onAddImage={addImage} />
              {onDelete ? (
                <Button
                  className="text-muted-foreground"
                  onClick={onDelete}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </div>
          </TooltipProvider>
        ) : null}
      </div>
      <MessageContent
        autoFocus={autoFocus}
        maxHeight={maxHeight}
        parts={message.parts}
        attachments={message.experimental_attachments}
        onChange={
          onChange ? (parts, attachments) => onChange({ ...message, parts, experimental_attachments: attachments }) : undefined
        }
      />
      {children}
    </div>
  );
}
