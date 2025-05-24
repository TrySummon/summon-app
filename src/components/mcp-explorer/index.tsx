import React, { useEffect, useState } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { McpServerStatus } from "@/helpers/mcp/state";

interface McpExplorerProps {
  mcpId: string;
  mcpName: string;
  transport: string;
  status: McpServerStatus | null;
  url?: string | null;
  error?: Error | string | null;
  isLoading: boolean;
  refreshStatus: () => void;
}

export const McpExplorer: React.FC<McpExplorerProps> = ({
  mcpId,
  mcpName,
  transport,
  status,
  url,
  error,
  isLoading,
  refreshStatus,
}) => {
  const [mcpTools, setMcpTools] = useState<Tool[]>([]);

  useEffect(() => {
    const fetchMcpTools = async () => {
      if (status === "running" && url) {
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
  }, [mcpId, status, url, transport]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-md shadow-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          <p>Checking server status...</p>
        </div>
      </div>
    );
  }

  console.log("MCP Tools:", mcpTools)

  return (
    <div className="space-y-6">
      <ServerStatusSection 
        status={status || 'stopped'}
        url={url || undefined}
        error={error}
        serverName={mcpName}
        transport={transport}
        refreshStatus={refreshStatus}
      />
      
      {status === "running" && <ToolsList tools={mcpTools} />}
    </div>
  );
};
