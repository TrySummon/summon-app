import React, { useEffect, useState, useCallback } from "react";
import { Tool, Prompt, Resource } from "@modelcontextprotocol/sdk/types.js";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { PromptsList } from "./PromptsList";
import { ResourcesList } from "./ResourcesList";
import {
  getMcpTools,
  getMcpPrompts,
  getMcpResources,
} from "@/ipc/mcp/mcp-client";
import { McpApiGroup } from "@/lib/db/mcp-db";

import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { useMcpServerState } from "@/hooks/useMcpServerState";
import { ApiConfig, ApiConfigs } from "../mcp-builder/api-config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LogsList from "./LogsList";

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
  const [mcpPrompts, setMcpPrompts] = useState<Prompt[]>([]);
  const [mcpResources, setMcpResources] = useState<Resource[]>([]);
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

  const fetchMcpPrompts = useCallback(async () => {
    try {
      const response = await getMcpPrompts(mcpId);
      if (response.success && response.data) {
        setMcpPrompts(response.data);
      } else {
        console.error("Failed to fetch MCP prompts:", response.message);
        setMcpPrompts([]);
      }
    } catch (err) {
      console.error("Failed to fetch MCP prompts:", err);
      setMcpPrompts([]);
    }
  }, [mcpId]);

  const fetchMcpResources = useCallback(async () => {
    try {
      const response = await getMcpResources(mcpId);
      if (response.success && response.data) {
        setMcpResources(response.data);
      } else {
        console.error("Failed to fetch MCP resources:", response.message);
        setMcpResources([]);
      }
    } catch (err) {
      console.error("Failed to fetch MCP resources:", err);
      setMcpResources([]);
    }
  }, [mcpId]);

  // Enhanced refresh function that refreshes status, tools, prompts, and resources
  const handleRefreshStatus = useCallback(async () => {
    await refreshStatus();
    await Promise.all([
      fetchMcpTools(),
      fetchMcpPrompts(),
      fetchMcpResources(),
    ]);
  }, [refreshStatus, fetchMcpTools, fetchMcpPrompts, fetchMcpResources]);

  useEffect(() => {
    Promise.all([fetchMcpTools(), fetchMcpPrompts(), fetchMcpResources()]);
  }, [fetchMcpTools, fetchMcpPrompts, fetchMcpResources, apiGroups]);

  if (isLoading) return null;

  return (
    <div className="flex flex-grow flex-col space-y-6">
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

      {state?.status === "running" && (
        <Tabs defaultValue="tools" className="flex-grow">
          <div className="mb-2 flex items-center justify-between gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value="tools">Tools ({mcpTools.length})</TabsTrigger>
              <TabsTrigger value="prompts">
                Prompts ({mcpPrompts.length})
              </TabsTrigger>
              <TabsTrigger value="resources">
                Resources ({mcpResources.length})
              </TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
            {onUpdateApiConfigs && (
              <ApiConfig apiGroups={apiGroups} onSave={onUpdateApiConfigs} />
            )}
          </div>
          <TabsContent value="tools" className="mt-4 flex flex-col">
            <ToolsList
              tools={mcpTools}
              mcpId={mcpId}
              onAddEndpoints={onAddEndpoints}
              onDeleteTool={onDeleteTool}
              onDeleteAllTools={onDeleteAllTools}
              refreshStatus={handleRefreshStatus}
            />
          </TabsContent>
          <TabsContent value="prompts" className="mt-4 flex flex-col">
            <PromptsList prompts={mcpPrompts} mcpId={mcpId} />
          </TabsContent>
          <TabsContent value="resources" className="mt-4 flex flex-col">
            <ResourcesList resources={mcpResources} mcpId={mcpId} />
          </TabsContent>
          <TabsContent value="logs" className="mt-4 flex flex-col">
            <LogsList mcpId={mcpId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Show logs when server is not running */}
      {state?.status !== "running" && (
        <div className="flex flex-grow flex-col">
          <LogsList mcpId={mcpId} />
        </div>
      )}
    </div>
  );
};
