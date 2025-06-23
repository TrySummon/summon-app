import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const fetchMcpTools = async () => {
      if (state?.status === "running") {
        try {
          const response = await getMcpTools(mcpId);
          if (response.success && response.data) {
            setMcpTools(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch MCP tools:", err);
        }
      }
    };

    fetchMcpTools();
  }, [mcpId, state?.status, apiGroups]);

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      <ServerStatusSection
        status={state?.status || "stopped"}
        url={url || undefined}
        error={error}
        serverName={mcpName}
        refreshStatus={refreshStatus}
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
        />
      )}
    </div>
  );
};
