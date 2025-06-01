import React, { useCallback } from 'react';
import { usePlaygroundStore } from '../store';
import Message from '../Message';
import { cn } from '@/utils/tailwind';
import { MessageCircle } from 'lucide-react';

export default function Messages() {
  const messages = usePlaygroundStore(state => state.tabs[state.currentTabId].state.messages);


  return (
          messages.length === 0 ? (
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
                  "px-4 pb-4 rounded-md hover:bg-accent"
                )}
              >
                <Message
                  message={message}
                  index={i}
                />
              </div>
            ))
          )
        );
}
