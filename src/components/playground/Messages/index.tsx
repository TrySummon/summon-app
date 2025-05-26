import React, { useCallback } from 'react';
import { usePlaygroundStore } from '../store';
import Message from '../Message';
import { UIMessage } from 'ai';
import { cn } from '@/utils/tailwind';
import { MessageCircle } from 'lucide-react';

export default function Messages() {
  // Subscribe to the messages state directly from the store
  const messages = usePlaygroundStore(state => state.getCurrentState().messages);
  const updateExistingMessage = usePlaygroundStore(state => state.updateExistingMessage);
  const deleteMessage = usePlaygroundStore(state => state.deleteMessage);

  // Function to handle changes to an existing message (will create a fork)
  // Always get the current index of the message by its ID to ensure we're using the correct index
  const handleMessageChange = useCallback((message: UIMessage, updatedMessage: UIMessage) => {
    const currentIndex = messages.findIndex(m => m.id === message.id);
    if (currentIndex !== -1) {
      updateExistingMessage(currentIndex, updatedMessage);
    }
  }, [messages, updateExistingMessage]);

  // Function to handle message deletion
  // Always get the current index of the message by its ID to ensure we're using the correct index
  const handleDeleteMessage = useCallback((message: UIMessage) => {
    const currentIndex = messages.findIndex(m => m.id === message.id);
    if (currentIndex !== -1) {
      deleteMessage(currentIndex);
    }
  }, [messages, deleteMessage]);

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      <div className='flex flex-col flex-grow max-w-4xl mx-auto px-4 w-full gap-4'>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-accent p-2 rounded-md mb-4">
            <MessageCircle />
          </div>
          <h3 className="text-base font-medium">Your conversation will appear here</h3>
        </div>
      ) : (
        messages.map((message, i) => (
          <div 
            key={message.id+i} 
            className={cn(
              "px-4 py-2 rounded-md",
              message.role === 'user' ? "bg-accent" : "bg-secondary/10"
            )}
          >
            <Message
              message={message}
              onChange={(updatedMessage) => handleMessageChange(message, updatedMessage)}
              onDelete={() => handleDeleteMessage(message)}
            />
          </div>
        ))
      )}
      </div>
    </div>
  );
}
