import React, { createContext, useContext } from "react";

import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { Message, Attachment } from "ai";
import { MentionData } from "@/components/CodeEditor";
import { McpData } from "@/lib/db/mcp-db";
import { useMcpActions, ToolResult } from "@/hooks/useMcpActions";

interface AgentContextType {
  onRefreshApis?: () => void;
  onAddEndpoints: (
    apiId: string,
    endpoints: SelectedEndpoint[],
  ) => Promise<ToolResult>;
  onDeleteTool: (toolName: string) => Promise<ToolResult>;
  onDeleteAllTools: () => Promise<ToolResult>;
  optimiseToolSize: (args: {
    apiId: string;
    toolName: string;
    goal: string;
  }) => Promise<ToolResult>;

  // Chat state and operations
  isRunning: boolean;

  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;

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

  // Agent tool operations (from consolidated MCP actions)
  addToolsToMcp: (
    selectedEndpoints: {
      apiId: string;
      endpointPath: string;
      endpointMethod: string;
    }[],
  ) => Promise<ToolResult>;
  removeMcpTool: (apiId: string, toolName: string) => Promise<ToolResult>;
  removeAllMcpTools: (apiId: string) => Promise<ToolResult>;
  listMcpTools: (apiId?: string) => Promise<ToolResult>;
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

  mcp: McpData;

  onRefreshApis?: () => void;

  // Chat state and operations from AgentSidebar
  isRunning: boolean;
  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;
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
  mcp,
  onRefreshApis,
  isRunning,
  attachedFiles,
  mentionData,
  autoApprove,
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
  // Use the consolidated MCP actions hook
  const {
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
    optimiseToolSize,
    addToolsToMcp,
    removeMcpTool,
    removeAllMcpTools,
    listMcpTools,
  } = useMcpActions(mcp.id);

  const contextValue: AgentContextType = {
    onRefreshApis,
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
    optimiseToolSize,
    // Chat state and operations
    isRunning,

    attachedFiles,
    mentionData,
    autoApprove,

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

    // Agent tool operations (now directly from consolidated hook)
    addToolsToMcp,
    removeMcpTool,
    removeAllMcpTools,
    listMcpTools,
  };

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
};
