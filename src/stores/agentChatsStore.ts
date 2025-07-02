import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { Message } from "ai";

export interface AgentChat {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface AgentChatsState {
  // mcpId -> array of chats (sorted by updatedAt desc)
  chatsByMcpId: Record<string, AgentChat[]>;
}

interface AgentChatsStore extends AgentChatsState {
  // Getters
  getChats: (mcpId: string) => AgentChat[] | undefined;
  getChat: (mcpId: string, chatId: string) => AgentChat | undefined | null;

  // Actions
  createChat: (mcpId: string, name?: string) => string;
  updateChat: (
    mcpId: string,
    chatId: string,
    updates: Partial<Pick<AgentChat, "name" | "messages">>,
  ) => void;
  deleteChat: (mcpId: string, chatId: string) => void;
}

const MAX_CHATS_PER_MCP = 10;

const createDefaultState = (): AgentChatsState => ({
  chatsByMcpId: {},
});

// Define the state that will be persisted to storage
type AgentChatsStorePersist = AgentChatsState;

// Configure persist options
const persistOptions: PersistOptions<AgentChatsStore, AgentChatsStorePersist> =
  {
    name: "agent-chats-store",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      chatsByMcpId: state.chatsByMcpId,
    }),
  };

export const useAgentChatsStore = create<AgentChatsStore>()(
  persist(
    (set, get) => ({
      ...createDefaultState(),

      getChats: (mcpId) => {
        return get().chatsByMcpId[mcpId] || [];
      },

      getChat: (mcpId, chatId) => {
        const chats = get().getChats(mcpId);
        return chats?.find((chat) => chat.id === chatId);
      },

      createChat: (mcpId, name = "New Chat") => {
        const newChat: AgentChat = {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          const existingChats = state.chatsByMcpId[mcpId] || [];
          const updatedChats = [newChat, ...existingChats].slice(
            0,
            MAX_CHATS_PER_MCP,
          );

          return {
            chatsByMcpId: {
              ...state.chatsByMcpId,
              [mcpId]: updatedChats,
            },
          };
        });

        return newChat.id;
      },

      updateChat: (mcpId, chatId, updates) => {
        set((state) => {
          const chats = state.chatsByMcpId[mcpId] || [];
          const chatIndex = chats.findIndex((chat) => chat.id === chatId);

          if (chatIndex === -1) return state;

          const updatedChat = {
            ...chats[chatIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          const updatedChats = [...chats];
          updatedChats[chatIndex] = updatedChat;

          // Sort chats by updatedAt desc to keep most recent first
          updatedChats.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );

          return {
            chatsByMcpId: {
              ...state.chatsByMcpId,
              [mcpId]: updatedChats.slice(0, MAX_CHATS_PER_MCP),
            },
          };
        });
      },

      deleteChat: (mcpId, chatId) => {
        set((state) => {
          const chats = state.chatsByMcpId[mcpId] || [];
          const updatedChats = chats.filter((chat) => chat.id !== chatId);

          return {
            chatsByMcpId: {
              ...state.chatsByMcpId,
              [mcpId]: updatedChats,
            },
          };
        });
      },
    }),
    persistOptions,
  ),
);

// Hook to get agent chats for a specific MCP
export function useAgentChats(mcpId: string) {
  const chats = useAgentChatsStore((state) => state.chatsByMcpId[mcpId]);

  const createChat = useAgentChatsStore((state) => state.createChat);
  const updateChat = useAgentChatsStore((state) => state.updateChat);
  const deleteChat = useAgentChatsStore((state) => state.deleteChat);
  const getChat = useAgentChatsStore((state) => state.getChat);

  return {
    chats,
    createChat: (name?: string) => createChat(mcpId, name),
    updateChat: (
      chatId: string,
      updates: Partial<Pick<AgentChat, "name" | "messages">>,
    ) => updateChat(mcpId, chatId, updates),
    deleteChat: (chatId: string) => deleteChat(mcpId, chatId),
    getChat: (chatId: string) => getChat(mcpId, chatId),
  };
}
