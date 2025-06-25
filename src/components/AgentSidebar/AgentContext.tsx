import React, { createContext, useContext, useCallback } from "react";

import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { Message, Attachment } from "ai";
import { MentionData } from "./index";
import { McpData } from "@/lib/db/mcp-db";

interface ToolResult {
  success: boolean;
  message: string;
}

interface AgentContextType {
  onRefreshApis?: () => void;
  onAddEndpoints: (apiId: string, endpoints: SelectedEndpoint[]) => void;
  onDeleteTool: (toolName: string) => void;
  onDeleteAllTools: () => void;

  // Chat state and operations
  isRunning: boolean;

  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;
  isAutoScrollEnabled: boolean;

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
  onAddEndpoints: (apiId: string, endpoints: SelectedEndpoint[]) => void;
  onDeleteTool: (toolName: string) => void;
  onDeleteAllTools: () => void;

  // Chat state and operations from AgentSidebar
  isRunning: boolean;
  attachedFiles: Attachment[];
  mentionData: MentionData[];
  autoApprove: boolean;
  isAutoScrollEnabled: boolean;
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
}

export const AgentProvider: React.FC<AgentProviderProps> = ({
  children,
  mcp,
  onRefreshApis,
  onAddEndpoints,
  onDeleteTool,
  onDeleteAllTools,
  isRunning,
  attachedFiles,
  mentionData,
  autoApprove,
  isAutoScrollEnabled,
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
}) => {
  // Map MCP operations to agent tool format
  const addToolsToMcp = useCallback(
    async (
      selectedEndpoints: {
        apiId: string;
        endpointPath: string;
        endpointMethod: string;
      }[],
    ): Promise<ToolResult> => {
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
            method: endpointMethod,
          };

          endpointsByApiId.get(apiId)!.push(selectedEndpoint);
        });

        // Call onAddEndpoints for each group
        for (const [apiId, endpoints] of endpointsByApiId) {
          onAddEndpoints(apiId, endpoints);
        }

        return {
          success: true,
          message: `Successfully added ${selectedEndpoints.length} tool(s)`,
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
        if (apiId) {
          const tools = mcp.apiGroups[apiId]?.tools;
          if (!tools) {
            return {
              success: false,
              message: `No tools found for API ID: ${apiId}`,
            };
          }

          const toolsWithApiId = tools.map((tool) => ({
            ...tool,
            apiId,
          }));

          return {
            success: true,
            message: JSON.stringify(toolsWithApiId),
          };
        }

        // Return all tools from all API groups
        const allTools: Array<{ apiId: string; [key: string]: unknown }> = [];

        Object.entries(mcp.apiGroups).forEach(([groupApiId, apiGroup]) => {
          if (apiGroup.tools) {
            const toolsWithApiId = apiGroup.tools.map((tool) => ({
              ...tool,
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
    // Chat state and operations
    isRunning,

    attachedFiles,
    mentionData,
    autoApprove,
    isAutoScrollEnabled,

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
