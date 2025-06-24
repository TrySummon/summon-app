import React, { useEffect, useState, useCallback } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { PromptsList } from "./PromptsList";
import { ResourcesList } from "./ResourcesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { McpServerStatus, McpTransport } from "@/lib/mcp/state";
import {
  getMcpTools,
  getMcpPrompts,
  getMcpResources,
} from "@/ipc/mcp/mcp-client";

interface Prompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

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
  const [mcpPrompts, setMcpPrompts] = useState<Prompt[]>([]);
  const [mcpResources, setMcpResources] = useState<Resource[]>([]);
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

  const fetchMcpPrompts = useCallback(async () => {
    if (status === "running") {
      try {
        const response = await getMcpPrompts(mcpId);
        if (response.success && response.data) {
          setMcpPrompts(response.data as Prompt[]);
        } else {
          console.error("Failed to fetch MCP prompts:", response.message);
          setMcpPrompts([]);
        }
      } catch (err) {
        console.error("Failed to fetch MCP prompts:", err);
        setMcpPrompts([]);
      }
    } else {
      setMcpPrompts([]);
    }
  }, [mcpId, status]);

  const fetchMcpResources = useCallback(async () => {
    if (status === "running") {
      try {
        const response = await getMcpResources(mcpId);
        if (response.success && response.data) {
          setMcpResources(response.data as Resource[]);
        } else {
          console.error("Failed to fetch MCP resources:", response.message);
          setMcpResources([]);
        }
      } catch (err) {
        console.error("Failed to fetch MCP resources:", err);
        setMcpResources([]);
      }
    } else {
      setMcpResources([]);
    }
  }, [mcpId, status]);

  // Enhanced refresh function that refreshes status, tools, prompts, and resources
  const handleRefreshStatus = useCallback(async () => {
    refreshStatus();
    // Also refresh all data after a short delay to ensure status is updated first
    setTimeout(() => {
      fetchMcpTools();
      fetchMcpPrompts();
      fetchMcpResources();
    }, 100);
  }, [refreshStatus, fetchMcpTools, fetchMcpPrompts, fetchMcpResources]);

  useEffect(() => {
    fetchMcpTools();
    fetchMcpPrompts();
    fetchMcpResources();
  }, [fetchMcpTools, fetchMcpPrompts, fetchMcpResources]);

  if (isLoading) return null;

  // Calculate total counts for tab labels
  const toolCount = mcpTools.length;
  const promptCount = mcpPrompts.length;
  const resourceCount = mcpResources.length;
  const totalCount = toolCount + promptCount + resourceCount;

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

      {status === "running" && totalCount > 0 && (
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools" className="flex items-center gap-2">
              Tools
              {toolCount > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {toolCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              Prompts
              {promptCount > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {promptCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              Resources
              {resourceCount > 0 && (
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {resourceCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-6">
            <ToolsList tools={mcpTools} />
          </TabsContent>

          <TabsContent value="prompts" className="mt-6">
            <PromptsList prompts={mcpPrompts} />
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <ResourcesList resources={mcpResources} />
          </TabsContent>
        </Tabs>
      )}

      {status === "running" && totalCount === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">
            This MCP server doesn't expose any tools, prompts, or resources.
          </p>
        </div>
      )}
    </div>
  );
};
