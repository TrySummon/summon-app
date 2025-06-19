import React from "react";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import Message from "../Message";
import CutIndicator from "./CutIndicator";
import { cn } from "@/utils/tailwind";
import { MessageCircle } from "lucide-react";

export default function Messages() {
  const messages = usePlaygroundStore(
    (state) => state.tabs[state.currentTabId].state.messages,
  );
  const cutMode = usePlaygroundStore(
    (state) => state.getCurrentState().cutMode,
  );

  return messages.length === 0 ? (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="bg-accent mb-4 rounded-md p-2">
        <MessageCircle />
      </div>
      <h3 className="text-base font-medium">
        Your conversation will appear here
      </h3>
    </div>
  ) : (
    <>
      {messages.map((message, i) => (
        <React.Fragment key={message.id + i}>
          {/* Show cut indicator before each message in cut mode, but only for real conversation messages (not system prompts) */}
          {cutMode && message.role !== "system" && i > 0 && (
            <CutIndicator position={i} />
          )}
          <div
            className={cn(
              "hover:border-accent rounded-md border border-transparent px-4 pb-4",
            )}
          >
            <Message message={message} index={i} />
          </div>
        </React.Fragment>
      ))}
      {/* Show final cut indicator after all messages in cut mode, but only if we have real conversation messages */}
      {cutMode && messages.some((m) => m.role !== "system") && (
        <CutIndicator position={messages.length} />
      )}
    </>
  );
}
