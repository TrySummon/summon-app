import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlaygroundStore } from '../store';
import { Attachment, UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { runAgent } from '../agent';
import { ArrowUp, Square } from 'lucide-react';
import { MessageContent } from '../Message/Content';
import ImageDialog from '@/components/ImageDialog';

export default function MessageComposer({ running }: { running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const playgroundStore = usePlaygroundStore();
  
  const [composer, setComposer] = useState<UIMessage>({
    id: uuidv4(),
    role: 'user',
    content: '',
    parts: [{ type: 'text', text: '' }]
  });

  const isComposerEmpty = !composer.parts.find(part => part.type === 'text' && part.text.trim() !== '');

  const disabled = running || isComposerEmpty;

  const handleAddMessage = useCallback(
    () => {
      if (disabled) return;
      
      // Trim the text before adding the message
      const trimmedComposer = {
        ...composer,
        parts: composer.parts.map(part => {
          if (part.type === 'text') {
            // Trim the text and remove leading/trailing new lines
            return { ...part, text: part.text.trim().replace(/^\n+|\n+$/g, '') };
          }
          return part;
        })
      };
      
      // Add the message to the current state using the zustand store
      playgroundStore.addMessage(trimmedComposer);
      // Reset the composer
      setComposer((prev) => ({
        id: uuidv4(),
        role: prev.role,
        content: '',
        parts: [{ type: 'text', text: '' }]
      }));
      runAgent(playgroundStore);
    },
    [disabled, composer, playgroundStore]
  );

  // Keyboard shortcut handler
  useEffect(() => {
    if (!ref.current) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        handleAddMessage();
      }
    };

    ref.current.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      ref.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAddMessage]);

  const addImage = useCallback(
    (url: string, contentType: string) => {
      const toAdd: Attachment = { url, contentType };
      setComposer({
        ...composer,
        experimental_attachments: [...(composer.experimental_attachments || []), toAdd]
      });
    },
    [composer, setComposer]
  );

  const submitButton = useMemo(() => {
    if (running) {
      return (
        <Button className='rounded-full' size="icon" onClick={playgroundStore.stopAgent}>
            <Square className="fill-current h-4 w-4" />
        </Button>
      );
    }
    
    return (
      <Button className='rounded-full' size="icon" disabled={disabled} onClick={handleAddMessage}>
        <ArrowUp className='h-4 w-4' />
      </Button>
    );
  }, [handleAddMessage, disabled, running,  playgroundStore.stopAgent]);

  return (
    <div className='flex flex-col w-full max-w-4xl mx-auto px-4'>
      <div ref={ref} className="flex flex-col bg-card gap-4 border rounded-md p-4">
          <MessageContent
            autoFocus
            maxHeight={200}
            message={composer}
            onChange={setComposer}
          />
        <div className="flex justify-between">
          <div className="flex items-center gap-2 -ml-2">
            <ImageDialog className="h-4 w-4" onAddImage={addImage} />
          </div>
          <div className="flex items-center gap-2">
            {submitButton}
          </div>
        </div>
      </div>
    </div>
  );
}
