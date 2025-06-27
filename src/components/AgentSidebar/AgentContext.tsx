import React, { createContext, useContext, useCallback } from "react";

import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { Message, Attachment } from "ai";
import { MentionData } from "./index";
import { McpData } from "@/lib/db/mcp-db";
import { useMcpActions } from "@/hooks/useMcpActions";

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  tokenCount?: number;
}

interface AgentContextType {
  onRefreshApis?: () => void;
  onAddEndpoints: (
    apiId: string,
    endpoints: SelectedEndpoint[],
  ) => Promise<ToolResult>;
  onDeleteTool: (toolName: string) => Promise<ToolResult>;
  onDeleteAllTools: () => Promise<ToolResult>;
  optimiseToolDefinition: (args: {
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

  // Agent tool operations (mapped from MCP operations)
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
  const {
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
    optimiseToolDefinition,
  } = useMcpActions(mcp.id);

  // Map MCP operations to agent tool format
  const addToolsToMcp = useCallback(
    async (
      selectedEndpoints: {
        apiId: string;
        endpointPath: string;
        endpointMethod: string;
      }[],
    ) => {
      try {
        // Group endpoints by apiId
        const endpointsByApiId = new Map<string, SelectedEndpoint[]>();

        selectedEndpoints.forEach((endpoint) => {
          const { apiId, endpointPath, endpointMethod } = endpoint;
          if (!endpointsByApiId.has(apiId)) {
            endpointsByApiId.set(apiId, []);
          }

          // Convert to SelectedEndpoint format
          const selectedEndpoint: SelectedEndpoint = {
            path: endpointPath,
            method: endpointMethod.toLowerCase(),
          };

          endpointsByApiId.get(apiId)!.push(selectedEndpoint);
        });

        const toolResults = await Promise.all(
          endpointsByApiId
            .entries()
            .map(([apiId, endpoints]) => onAddEndpoints(apiId, endpoints)),
        );

        return {
          success: true,
          message: JSON.stringify(toolResults),
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [onAddEndpoints],
  );

  const removeMcpTool = useCallback(
    async (_apiId: string, toolName: string): Promise<ToolResult> => {
      try {
        // Call the MCP operation (it handles finding the tool across API groups)
        onDeleteTool(toolName);

        return {
          success: true,
          message: `Successfully removed tool: ${toolName}`,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [onDeleteTool],
  );

  const removeAllMcpTools = useCallback(async (): Promise<ToolResult> => {
    try {
      // Call the MCP operation
      onDeleteAllTools();

      return {
        success: true,
        message: "Successfully removed all tools",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, [onDeleteAllTools]);

  const listMcpTools = useCallback(
    async (apiId?: string): Promise<ToolResult> => {
      try {
        // Return all tools from all API groups
        const allTools: Array<{ apiId: string; [key: string]: unknown }> = [];

        Object.entries(mcp.apiGroups).forEach(([groupApiId, apiGroup]) => {
          if (apiId && groupApiId !== apiId) {
            return;
          }

          if (apiGroup.tools) {
            const toolsWithApiId = apiGroup.tools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              originalTokenCount: tool.originalTokenCount,
              isOptimised: !!tool.optimised,
              apiId: groupApiId,
            }));
            allTools.push(...toolsWithApiId);
          }
        });

        return {
          success: true,
          message: JSON.stringify(allTools),
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [mcp],
  );

  const contextValue: AgentContextType = {
    onRefreshApis,
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
    optimiseToolDefinition,
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

    // Agent tool operations
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
