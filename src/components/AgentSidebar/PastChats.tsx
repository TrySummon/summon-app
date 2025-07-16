import React from "react";
import { Clock, MessageCircle } from "lucide-react";
import { formatRelativeDate } from "@/utils/formatDate";
import { useAgentChats } from "@/stores/agentChatsStore";
import { useAgentContext } from "./AgentContext";

interface PastChatsProps {
  mcpId: string;
}

export function PastChats({ mcpId }: PastChatsProps) {
  const { chats } = useAgentChats(mcpId);
  const { handleLoadChat } = useAgentContext();

  if (!chats?.length) {
    return (
      <div className="space-y-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>Recent Chats</span>
        </div>
        <div className="py-8 text-center">
          <MessageCircle className="text-muted-foreground/50 mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">No chat history yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 space-y-2">
      <div className="text-muted-foreground flex items-center gap-2 px-2 text-sm">
        <Clock className="h-4 w-4" />
        <span>Recent Chats</span>
      </div>

      <div className="overflow-y-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="hover:bg-accent/50 cursor-pointer rounded-lg px-3 py-2 transition-colors"
            onClick={() => handleLoadChat(chat.id, chat.messages)}
          >
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h3 className="truncate text-sm font-medium">{chat.name}</h3>
              </div>
              <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
                {formatRelativeDate(chat.updatedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
