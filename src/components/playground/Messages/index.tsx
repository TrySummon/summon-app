import React from "react";
import { usePlaygroundStore } from "../store";
import Message from "../Message";
import { cn } from "@/utils/tailwind";
import { MessageCircle } from "lucide-react";

export default function Messages() {
  const messages = usePlaygroundStore(
    (state) => state.tabs[state.currentTabId].state.messages,
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
    messages.map((message, i) => (
      <div
        key={message.id + i}
        className={cn("hover:bg-accent rounded-md px-4 pb-4")}
      >
        <Message message={message} index={i} />
      </div>
    ))
  );
}
