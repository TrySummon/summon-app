import React, { createContext, useContext } from "react";

import { Message, Attachment } from "ai";
import { MentionData } from "@/components/CodeEditor";
import { AgentToolBox } from "@/types/agent";

interface AgentContextType {
  // Tool agent for handling tool-specific operations
  toolBox: AgentToolBox;

  // Chat state and operations
  isRunning: boolean;

  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;
  composerPlaceholder: string;

  // Chat operations
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
  setAutoApprove: (value: boolean) => void;
  onSendMessage: (message: Message) => boolean;
  onStopAgent: () => void;
  onRevert: (messageId: string) => void;
  onUpdateMessage: (message: Message) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAttachments: () => void;
  handleNewChat: () => void;
  handleStarterClick: (prompt: string) => void;
  handleLoadChat: (chatId: string, messages: Message[]) => void;
  hasRevertState: (messageId: string) => boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentContext must be used within an AgentProvider");
  }
  return context;
};

interface AgentProviderProps {
  children: React.ReactNode;

  // Tool agent for handling tool-specific operations
  toolBox: AgentToolBox;

  // Chat state and operations from AgentSidebar
  isRunning: boolean;
  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;
  composerPlaceholder: string;
  addToolResult: (params: { toolCallId: string; result: unknown }) => void;
  setAutoApprove: (value: boolean) => void;
  onSendMessage: (message: Message) => boolean;
  onStopAgent: () => void;
  onRevert: (messageId: string) => void;
  onUpdateMessage: (message: Message) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAttachments: () => void;
  handleNewChat: () => void;
  handleStarterClick: (prompt: string) => void;
  handleLoadChat: (chatId: string, messages: Message[]) => void;
  hasRevertState: (messageId: string) => boolean;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({
  children,
  toolBox,
  isRunning,
  attachedFiles,
  mentionData,
  autoApprove,
  composerPlaceholder,
  addToolResult,
  setAutoApprove,
  onSendMessage,
  onStopAgent,
  onRevert,
  onUpdateMessage,
  onRemoveFile,
  onClearAttachments,
  handleNewChat,
  handleStarterClick,
  handleLoadChat,
  hasRevertState,
}) => {
  const contextValue: AgentContextType = {
    // Tool agent for handling tool-specific operations
    toolBox,

    // Chat state and operations
    isRunning,

    attachedFiles,
    mentionData,
    autoApprove,
    composerPlaceholder,

    addToolResult,
    setAutoApprove,
    onSendMessage,
    onStopAgent,
    onRevert,
    onUpdateMessage,
    onRemoveFile,
    onClearAttachments,
    handleNewChat,
    handleStarterClick,
    handleLoadChat,
    hasRevertState,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};
