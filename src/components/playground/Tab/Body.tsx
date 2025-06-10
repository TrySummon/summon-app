import React, { useRef, useEffect, useState, useCallback } from "react";
import { usePlaygroundStore } from "../store";
import LatencyStats from "./LatencyStats";
import SystemPrompt from "../SystemPrompt";
import Messages from "../Messages";

export default function TabBody() {
  const isRunning = usePlaygroundStore(
    (state) => state.getCurrentState().running,
  );
  const shouldScrollToDock = usePlaygroundStore(
    (state) => state.getCurrentState().shouldScrollToDock,
  );
  const messages = usePlaygroundStore(
    (state) => state.getCurrentState().messages,
  );
  const updateShouldScrollToDock = usePlaygroundStore(
    (state) => state.updateShouldScrollToDock,
  );

  // Ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // State to track if content is scrollable
  const [isScrollable, setIsScrollable] = useState(false);

  // Function to check if scroll is at the bottom and update the store
  const checkIfScrollDocked = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const bottomGap =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = bottomGap < 50;
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
    if (shouldScrollToDock && isRunning) {
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
  }, [isRunning, messages, shouldScrollToDock, scrollToBottom]);

  const showScrollButton = !shouldScrollToDock && isScrollable;

  return (
    <div className="relative flex flex-1 flex-col overflow-y-auto">
      <div
        ref={messagesContainerRef}
        className="flex flex-1 flex-col overflow-y-auto"
        onScroll={checkIfScrollDocked}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-grow flex-col gap-2 px-4">
          <div className="px-4">
            <SystemPrompt className="hover:bg-background/20" />
          </div>
          <Messages />
        </div>
      </div>
      <LatencyStats
        scrollToBottom={scrollToBottom}
        showScrollButton={showScrollButton}
      />
    </div>
  );
}
