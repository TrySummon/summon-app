import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AgentSidebar } from "../../AgentSidebar";
import { useMcp, useMcps } from "@/hooks/useMcps";
import { useApis } from "@/hooks/useApis";
import { McpBuilderToolBox } from "@/components/mcp-builder/agent/toolbox";
import { MentionData } from "@/components/CodeEditor";
import { McpData } from "@/lib/db/mcp-db";
import { importApi } from "@/ipc/openapi/openapi-client";
import { Attachment } from "ai";

interface McpAgentSidebarProps {
  mcpId: string;
}

export function McpBuilderAgentSidebar({ mcpId }: McpAgentSidebarProps) {
  const { apis, refetch: refetchApis } = useApis();
  const { mcp } = useMcp(mcpId);
  const { updateMcp } = useMcps();

  // MCP-specific state for revert functionality
  const mcpVersionsRef = useRef<Record<string, McpData>>({});

  // State for storing the current chat ID
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  // Load the last visited chat for this MCP when mcpId changes
  useEffect(() => {
    const savedChatId = localStorage.getItem(`mcp-chat-${mcpId}`);
    setCurrentChatId(savedChatId || undefined);
  }, [mcpId]);

  // Save chat ID to localStorage and update state
  const handleChatIdChange = useCallback(
    (mcpId: string, chatId: string | undefined) => {
      if (chatId) {
        localStorage.setItem(`mcp-chat-${mcpId}`, chatId);
      } else {
        localStorage.removeItem(`mcp-chat-${mcpId}`);
      }
      setCurrentChatId(chatId);
    },
    [],
  );

  // Create the MCP builder agent
  const toolBox = useMemo(() => new McpBuilderToolBox(mcpId), [mcpId]);

  // Compute MCP-specific mention data
  const mentionData = useMemo(() => {
    const data: MentionData[] = [];

    // 1. MCP Tools
    if (mcp?.apiGroups) {
      for (const group of Object.values(mcp.apiGroups)) {
        if (group.tools) {
          for (const tool of group.tools) {
            data.push({
              id: `mcp-tool-${tool.name}`,
              name: tool?.optimised?.name || tool.name,
              type: "tool",
            });
          }
        }
      }
    }

    // 2. APIs and their endpoints
    if (apis) {
      apis.forEach(({ id: apiId }) => {
        // Add API itself
        data.push({
          id: `api-${apiId}`,
          name: apiId,
          type: "api",
        });
      });
    }

    return data;
  }, [mcp, apis]);

  const processFile = useCallback(
    async (file: File) => {
      let apiId: string | null = null;

      // Check if it's a JSON file and try to import as OpenAPI spec
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        try {
          const result = await importApi(file);
          if (result.success) {
            // Refresh the APIs list to update mentions
            refetchApis();
            apiId = result.apiId ?? null;
          }
        } catch (error) {
          // If import fails, treat as regular file attachment
          console.error(
            `Failed to import ${file.name} as OpenAPI spec:`,
            error,
          );
        }
      }

      // If successfully imported as API, create API attachment
      if (apiId) {
        const apiContent = `User uploaded OpenAPI spec for API with ID: ${apiId}`;
        const dataUrl = `data:text/plain;base64,${btoa(apiContent)}`;

        const newFile: Attachment = {
          name: apiId,
          contentType: "application/x-summon-api",
          url: dataUrl,
        };
        return newFile;
      }

      return null;
    },
    [refetchApis],
  );

  // Handle MCP-specific revert logic
  const handleRevert = useCallback(
    (messageId: string) => {
      const storedMcp = mcpVersionsRef.current[messageId];
      if (storedMcp) {
        // Convert McpData to McpSubmitData by omitting id, createdAt, updatedAt
        const mcpSubmitData = {
          name: storedMcp.name,
          transport: storedMcp.transport,
          apiGroups: storedMcp.apiGroups,
        };
        updateMcp({
          mcpId: storedMcp.id,
          mcpData: mcpSubmitData,
        });

        // Clean up stored versions after revert
        delete mcpVersionsRef.current[messageId];
      }
    },
    [updateMcp],
  );

  // Check if a message has revert state available
  const hasRevertState = useCallback((messageId: string): boolean => {
    return messageId in mcpVersionsRef.current;
  }, []);

  // MCP-specific file types
  const acceptedFileTypes = useMemo(
    () => ({
      "application/json": [".json"],
      "text/yaml": [".yaml"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    }),
    [],
  );

  if (!mcp) {
    return null;
  }

  return (
    <AgentSidebar
      agentId={mcpId}
      apiPath={`/api/agent`}
      toolBox={toolBox}
      composerPlaceholder="Add, improve and manage MCP tools."
      defaultChatId={currentChatId}
      onChatIdChange={handleChatIdChange}
      mentionData={mentionData}
      processFile={processFile}
      onRevert={handleRevert}
      hasRevertState={hasRevertState}
      acceptedFileTypes={acceptedFileTypes}
      chatNamePrefix="New Chat"
    />
  );
}

// Export the store MCP state function for external use
export const useMcpStateManager = (mcpId: string) => {
  const { mcp } = useMcp(mcpId);
  const mcpVersionsRef = useRef<Record<string, McpData>>({});

  const storeMcpState = useCallback(
    (messageId: string) => {
      if (mcp && messageId) {
        mcpVersionsRef.current[messageId] = mcp;
      }
    },
    [mcp],
  );

  const clearMcpState = useCallback(() => {
    mcpVersionsRef.current = {};
  }, []);

  return {
    storeMcpState,
    clearMcpState,
  };
};
