import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Message from '../Message';
import { Kbd } from '@/components/Kbd';
import { Button } from '@/components/ui/button';
import { usePlaygroundStore } from '../store';
import { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export default function MessageComposer({ running }: { running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    addMessage,
  } = usePlaygroundStore();
  
  const [composer, setComposer] = useState<UIMessage>({
    id: uuidv4(),
    role: 'user',
    content: '',
    parts: [{ type: 'text', text: '' }]
  });
  
  // Function to handle changes to the message content
  const handleMessageChange = useCallback((updatedMessage: UIMessage) => {
    // Ensure content and parts are in sync
    const textPart = updatedMessage.parts.find(part => part.type === 'text');
    const updatedContent = textPart ? textPart.text.trim() : '';
    
    setComposer({
      ...updatedMessage,
      content: updatedContent
    });
  }, []);

  const disabled = running || !composer.content;

  const handleAddMessage = useCallback(
    () => {
      if (disabled) return;
      
      // Add the message to the current state using the zustand store
      addMessage(composer);
      // Reset the composer
      setComposer((prev) => ({
        id: uuidv4(),
        role: prev.role,
        content: '',
        parts: [{ type: 'text', text: '' }]
      }));
    },
    [disabled, composer, addMessage]
  );

  // Keyboard shortcut handler
  useEffect(() => {
    if (!ref.current) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleAddMessage();
      }
    };

    ref.current.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      ref.current?.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleAddMessage]);

  const addMessageButton = (
    <Button
      data-testid="add-message-tabs"
      onClick={handleAddMessage}
      size="sm"
      variant="outline"
      disabled={disabled}
    >
      Add
    </Button>
  );

  const submitButton = useMemo(() => {
    return (
      <Button className='gap-2' size="sm" disabled={disabled} onClick={handleAddMessage}>
        Submit <Kbd>Cmd+Enter</Kbd>
      </Button>
    );
  }, [handleAddMessage, disabled]);

  return (
    <div className='flex flex-col w-full max-w-4xl mx-auto px-4'>
      <div ref={ref} className="flex flex-col bg-card gap-1 border rounded-md px-4 py-2">
        <Message
          autoFocus
          message={composer}
          onChange={handleMessageChange}
          maxHeight={200}
        >
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              {addMessageButton}
              {submitButton}
            </div>
          </div>
        </Message>
      </div>
    </div>
  );
}
