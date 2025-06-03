import React, { useEffect, useState } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { McpServerStatus, McpTransport } from "@/helpers/mcp/state";

interface McpExplorerProps {
  mcpId: string;
  mcpName: string;
  transport?: McpTransport;
  status?: McpServerStatus;
  error?: Error | string | null;
  isLoading: boolean;
  refreshStatus: () => void;
}

export const McpExplorer: React.FC<McpExplorerProps> = ({
  mcpId,
  mcpName,
  transport,
  status,
  error,
  isLoading,
  refreshStatus,
}) => {
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);
  const url = transport && "url" in transport ? transport.url : undefined;

  useEffect(() => {
    const fetchMcpTools = async () => {
      if (status === "running") {
        try {
          const response = await window.mcpApi.getMcpTools(mcpId);
          if (response.success && response.data) {
            setMcpTools(response.data);
          }
        } catch (err) {
          console.error("Failed to fetch MCP tools:", err);
        }
      }
    };

    fetchMcpTools();
  }, [mcpId, status]);

  if (isLoading) {
    return (
      <div className="rounded-md bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center">
          <div className="border-primary mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
          <p>Checking server status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ServerStatusSection
        status={status || "stopped"}
        url={url || undefined}
        error={error}
        serverName={mcpName}
        transport={transport?.type}
        refreshStatus={refreshStatus}
        mcpId={mcpId}
      />

      {status === "running" && <ToolsList tools={mcpTools} />}
    </div>
  );
};
