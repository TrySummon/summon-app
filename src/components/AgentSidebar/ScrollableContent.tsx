import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { SidebarContent } from "@/components/ui/sidebar";

import { Message } from "ai";
import { ChatStarters } from "./ChatStarters";
import { MessagesList } from "./MessagesList";

interface ScrollableContentProps {
  messages: Message[];
  isRunning: boolean;
}

export interface ScrollableContentRef {
  scrollToLatestUserMessage: () => void;
}

export const ScrollableContent = forwardRef<
  ScrollableContentRef,
  ScrollableContentProps
>(({ messages, isRunning }, ref) => {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [placeholderHeight, setPlaceholderHeight] = useState(0);
  const placeholderHeightRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestUserMessageRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Check if user is near bottom
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const threshold = 50; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Handle scroll events to detect dock out/in
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const nearBottom = isNearBottom();

    // If user scrolled up and we're not near bottom, disable auto-scroll
    if (!nearBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    }
    // If user scrolled back to bottom, re-enable auto-scroll
    else if (nearBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
  }, [isAutoScrollEnabled, isNearBottom]);

  // Auto-scroll when agent is running and auto-scroll is enabled
  useEffect(() => {
    if (isRunning && isAutoScrollEnabled && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isRunning, isAutoScrollEnabled, scrollToBottom]);

  // Enable auto-scroll when agent starts running
  useEffect(() => {
    if (isRunning) {
      setIsAutoScrollEnabled(true);
    }
  }, [isRunning]);

  // Calculate placeholder height to ensure scroll space
  const calculatePlaceholderHeight = useCallback(() => {
    if (!scrollContainerRef.current || !latestUserMessageRef.current) {
      return 0;
    }

    const containerScrollHeight = scrollContainerRef.current.scrollHeight;
    const containerClientHeight = scrollContainerRef.current.clientHeight;
    const messageElement = latestUserMessageRef.current;
    const messageOffsetTop = messageElement.offsetTop;

    const requiredTotalHeight = messageOffsetTop + containerClientHeight;
    const currentContentHeight =
      containerScrollHeight - placeholderHeightRef.current;
    const requiredPlaceholder = Math.max(
      0,
      requiredTotalHeight - currentContentHeight - 100,
    );
    return requiredPlaceholder;
  }, []); // No dependencies since we use ref instead of state

  // Update placeholder height when messages change
  useEffect(() => {
    const newHeight = calculatePlaceholderHeight();
    placeholderHeightRef.current = newHeight;
    setPlaceholderHeight(newHeight);
  }, [messages, calculatePlaceholderHeight]);

  // Scroll to position the latest user message at the top
  const scrollToLatestUserMessage = useCallback(() => {
    if (!scrollContainerRef.current || !latestUserMessageRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const messageElement = latestUserMessageRef.current;

    // Get the message's position relative to the scrollable container
    const messageOffsetTop = messageElement.offsetTop;

    // Scroll to position the message at the top (with small offset for padding)
    container.scrollTop = messageOffsetTop - 16; // 16px offset for padding
  }, []);

  // Expose the scroll function to parent component
  useImperativeHandle(
    ref,
    () => ({
      scrollToLatestUserMessage,
    }),
    [scrollToLatestUserMessage],
  );

  return (
    <SidebarContent
      className="flex min-h-0 flex-1 flex-col"
      ref={scrollContainerRef}
      onScroll={handleScroll}
    >
      <div className="flex flex-1 flex-col p-4 pb-0">
        {messages.length === 0 ? (
          <ChatStarters />
        ) : (
          <MessagesList
            latestUserMessageRef={latestUserMessageRef}
            messages={messages}
            placeholderHeight={placeholderHeight}
          />
        )}
      </div>
    </SidebarContent>
  );
});

ScrollableContent.displayName = "ScrollableContent";
