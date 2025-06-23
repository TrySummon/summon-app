import React, { useEffect, useState, useCallback } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { McpServerStatus, McpTransport } from "@/lib/mcp/state";
import { getMcpTools } from "@/ipc/mcp/mcp-client";

interface McpExplorerProps {
  mcpId: string;
  mcpName: string;
  transport?: McpTransport;
  status?: McpServerStatus;
  error?: Error | string | null;
  isLoading: boolean;
  isExternal?: boolean;
  refreshStatus: () => void;
}

export const McpExplorer: React.FC<McpExplorerProps> = ({
  mcpId,
  mcpName,
  transport,
  status,
  error,
  isLoading,
  isExternal,
  refreshStatus,
}) => {
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);
  const url = transport && "url" in transport ? transport.url : undefined;

  const fetchMcpTools = useCallback(async () => {
    if (status === "running") {
      try {
        const response = await getMcpTools(mcpId);
        if (response.success && response.data) {
          setMcpTools(response.data);
        } else {
          console.error("Failed to fetch MCP tools:", response.message);
          setMcpTools([]);
        }
      } catch (err) {
        console.error("Failed to fetch MCP tools:", err);
        setMcpTools([]);
      }
    } else {
      setMcpTools([]);
    }
  }, [mcpId, status]);

  // Enhanced refresh function that refreshes both status and tools
  const handleRefreshStatus = useCallback(async () => {
    refreshStatus();
    // Also refresh tools after a short delay to ensure status is updated first
    setTimeout(() => {
      fetchMcpTools();
    }, 100);
  }, [refreshStatus, fetchMcpTools]);

  useEffect(() => {
    fetchMcpTools();
  }, [fetchMcpTools]);

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <ServerStatusSection
        status={status || "stopped"}
        url={url || undefined}
        error={error}
        serverName={mcpName}
        transport={transport?.type}
        refreshStatus={handleRefreshStatus}
        mcpId={mcpId}
        isExternal={isExternal}
      />

      {status === "running" && <ToolsList tools={mcpTools} />}
    </div>
  );
};
