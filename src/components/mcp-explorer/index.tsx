import React, { useEffect, useState, useCallback } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { getMcpTools } from "@/ipc/mcp/mcp-client";
import { McpApiGroup } from "@/lib/db/mcp-db";

import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { useMcpServerState } from "@/hooks/useMcpServerState";
import { ApiConfig, ApiConfigs } from "../mcp-builder/api-config";

interface McpExplorerProps {
  mcpId: string;
  mcpName: string;
  onAddEndpoints?: (apiId: string, endpoints: SelectedEndpoint[]) => void;
  onDeleteTool?: (toolName: string) => void;
  onDeleteAllTools?: () => void;
  onUpdateApiConfigs?: (apiConfigs: ApiConfigs) => void;
  onEditName?: (newName: string) => void;
  isExternal?: boolean;
  apiGroups?: Record<string, McpApiGroup>;
}

export const McpExplorer: React.FC<McpExplorerProps> = ({
  mcpId,
  mcpName,
  onAddEndpoints,
  onDeleteTool,
  onDeleteAllTools,
  onUpdateApiConfigs,
  onEditName,
  apiGroups,
  isExternal,
}) => {
  const { state, isLoading, error, refreshStatus } = useMcpServerState(mcpId);
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);
  const url =
    state?.transport && "url" in state.transport
      ? state.transport.url
      : undefined;

  const fetchMcpTools = useCallback(async () => {
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
  }, [mcpId]);

  // Enhanced refresh function that refreshes both status and tools
  const handleRefreshStatus = useCallback(async () => {
    await refreshStatus();
    await fetchMcpTools();
  }, [refreshStatus, fetchMcpTools]);

  useEffect(() => {
    fetchMcpTools();
  }, [fetchMcpTools, apiGroups]);

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <ServerStatusSection
        status={state?.status || "stopped"}
        url={url || undefined}
        error={error}
        serverName={mcpName}
        refreshStatus={handleRefreshStatus}
        mcpId={mcpId}
        isExternal={isExternal}
        onEditName={onEditName}
      />

      {onUpdateApiConfigs && (
        <ApiConfig apiGroups={apiGroups} onSave={onUpdateApiConfigs} />
      )}

      {state?.status === "running" && (
        <ToolsList
          tools={mcpTools}
          onAddEndpoints={onAddEndpoints}
          onDeleteTool={onDeleteTool}
          onDeleteAllTools={onDeleteAllTools}
        />
      )}
    </div>
  );
};
