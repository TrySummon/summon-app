import React, { useCallback, useRef, useEffect, useState } from 'react';
import { usePlaygroundStore } from '../store';
import Message from '../Message';
import { UIMessage } from 'ai';
import { cn } from '@/utils/tailwind';
import { MessageCircle, ChevronDown, Clock, Hash, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SystemPrompt from '../SystemPrompt';

export default function Messages() {
  // Subscribe to the messages state directly from the store
  const messages = usePlaygroundStore(state => state.getCurrentState().messages);
  const isRunning = usePlaygroundStore(state => state.getCurrentState().running);
  const shouldScrollToDock = usePlaygroundStore(state => state.getCurrentState().shouldScrollToDock);
  const tokenUsage = usePlaygroundStore(state => state.getCurrentState().tokenUsage);
  const latency = usePlaygroundStore(state => state.getCurrentState().latency);
  const systemPrompt = usePlaygroundStore(state => state.getCurrentState().systemPrompt || '');
  const updateMessage = usePlaygroundStore(state => state.updateMessage);
  const deleteMessage = usePlaygroundStore(state => state.deleteMessage);
  const rerunFromMessage = usePlaygroundStore(state => state.rerunFromMessage);
  const updateSystemPrompt = usePlaygroundStore(state => state.updateSystemPrompt);
  const updateShouldScrollToDock = usePlaygroundStore(state => state.updateShouldScrollToDock);
  
  // Ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const handleMessageChange = useCallback((index: number, updatedMessage: UIMessage) => {    
      updateMessage(index, updatedMessage);
  }, [updateMessage]);

  // Function to handle message deletion
  const handleDeleteMessage = useCallback((index: number) => {
    deleteMessage(index);
  }, [deleteMessage]);

  // Function to handle message rerun
  const handleRerunMessage = useCallback((index: number) => {
    rerunFromMessage(index);
  }, [rerunFromMessage]);
  
  // State to track if content is scrollable
  const [isScrollable, setIsScrollable] = useState(false);

  // Function to check if scroll is at the bottom and update the store
  // Also check if content is scrollable
  const checkIfScrollDocked = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10;
    updateShouldScrollToDock(isAtBottom);
    
    // Update scrollable state
    setIsScrollable(container.scrollHeight > container.clientHeight);
  }, [updateShouldScrollToDock]);
  
  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);
  
  // Auto-scroll when messages change if docked and running
  useEffect(() => {
    if ((shouldScrollToDock && isRunning) || messages.length === 0) {
      scrollToBottom();
    }
    
    // Check if content is scrollable whenever messages change
    const checkScrollable = () => {
      const container = messagesContainerRef.current;
      if (container) {
        setIsScrollable(container.scrollHeight > container.clientHeight);
      }
    };
    
    checkScrollable();
    
    // Use ResizeObserver to detect changes in content size
    const resizeObserver = new ResizeObserver(checkScrollable);
    if (messagesContainerRef.current) {
      resizeObserver.observe(messagesContainerRef.current);
    }
    
    return () => {
      if (messagesContainerRef.current) {
        resizeObserver.unobserve(messagesContainerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [messages, isRunning, shouldScrollToDock, scrollToBottom]);

  // Format latency to be more readable (ms or s)
  const formatLatency = (latencyMs?: number) => {
    if (!latencyMs) return '0ms';
    if (latencyMs < 1000) return `${latencyMs}ms`;
    return `${(latencyMs / 1000).toFixed(2)}s`;
  };

  const showDetails = tokenUsage || latency;
  const showScrollButton = !shouldScrollToDock && isScrollable && messages.length > 0;

  return (
    <div className="flex flex-col relative overflow-y-auto flex-1">
      <div 
        ref={messagesContainerRef}
        className="flex flex-col overflow-y-auto flex-1"
        onScroll={checkIfScrollDocked}>
        <div className='flex flex-col flex-grow max-w-4xl mx-auto px-4 w-full gap-2'>
          {/* System Prompt */}
          <div className="px-2">
            <SystemPrompt
              value={systemPrompt}
              onChange={updateSystemPrompt}
              readOnly={isRunning}
              className="hover:bg-background/20"
            />
          </div>
          
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
                  "px-4 pb-4 rounded-md hover:bg-accent"
                )}
              >
                <Message
                  message={message}
                  onChange={(updatedMessage) => handleMessageChange(i, updatedMessage)}
                  onDelete={() => handleDeleteMessage(i)}
                  onRerun={() => handleRerunMessage(i)}
                />
              </div>
            ))
          )}
          <div className="h-4" />
        </div>
      </div>      
      {showDetails || showScrollButton ? (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col gap-2 items-center">
          {showScrollButton && (
               <Button
               size="icon"
               onClick={scrollToBottom}
               className="rounded-full h-6 w-6"
               aria-label="Scroll to bottom"
             >
               <ChevronDown className="h-4 w-4" />
             </Button>
          )}

          {showDetails && (
          <Badge variant="outline" className={cn('text-xs flex items-center gap-1 font-mono text-muted-foreground bg-background', showScrollButton ? "border" : "border-none" )}>
          {latency !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 " />
              <span>{formatLatency(latency)}</span>
            </div>
          )}
          {tokenUsage && (
            <>
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <span>{tokenUsage.inputTokens}t</span>
            </div>
                             <div className="flex items-center gap-1">
                             <ArrowDown className="h-3 w-3" />
                             <span>{tokenUsage.outputTokens}t</span>
                           </div>
                           </>
          )}
          </Badge>
          )}
        </div>
      ) : null}
    </div>
  );
}
