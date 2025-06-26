import React, { useEffect, useState, useCallback } from "react";
import { Tool, Resource, Prompt } from "@modelcontextprotocol/sdk/types";
import { ServerStatusSection } from "./ServerStatusSection";
import { ToolsList } from "./ToolsList";
import { ResourcesList } from "./ResourcesList";
import { PromptsList } from "./PromptsList";
import {
  getMcpTools,
  getMcpResources,
  getMcpPrompts,
} from "@/ipc/mcp/mcp-client";
import { McpApiGroup } from "@/lib/db/mcp-db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wrench, Database, MessageSquare } from "lucide-react";

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
  const [mcpResources, setMcpResources] = useState<Resource[]>([]);
  const [mcpPrompts, setMcpPrompts] = useState<Prompt[]>([]);
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

  const fetchMcpResources = useCallback(async () => {
    try {
      console.log(`[MCP Explorer] Fetching resources for server ${mcpId}...`);
      const response = await getMcpResources(mcpId);
      console.log(`[MCP Explorer] Resources response:`, response);
      if (response.success && response.data) {
        setMcpResources(response.data);
        console.log(`[MCP Explorer] Found ${response.data.length} resources`);
      } else {
        console.error("Failed to fetch MCP resources:", response.message);
        setMcpResources([]);
      }
    } catch (err) {
      console.error("Failed to fetch MCP resources:", err);
      setMcpResources([]);
    }
  }, [mcpId]);

  const fetchMcpPrompts = useCallback(async () => {
    try {
      console.log(`[MCP Explorer] Fetching prompts for server ${mcpId}...`);
      const response = await getMcpPrompts(mcpId);
      console.log(`[MCP Explorer] Prompts response:`, response);
      if (response.success && response.data) {
        setMcpPrompts(response.data);
        console.log(`[MCP Explorer] Found ${response.data.length} prompts`);
      } else {
        console.error("Failed to fetch MCP prompts:", response.message);
        setMcpPrompts([]);
      }
    } catch (err) {
      console.error("Failed to fetch MCP prompts:", err);
      setMcpPrompts([]);
    }
  }, [mcpId]);

  // Enhanced refresh function that refreshes status, tools, resources, and prompts
  const handleRefreshStatus = useCallback(async () => {
    await refreshStatus();
    await Promise.all([
      fetchMcpTools(),
      fetchMcpResources(),
      fetchMcpPrompts(),
    ]);
  }, [refreshStatus, fetchMcpTools, fetchMcpResources, fetchMcpPrompts]);

  useEffect(() => {
    Promise.all([fetchMcpTools(), fetchMcpResources(), fetchMcpPrompts()]);
  }, [fetchMcpTools, fetchMcpResources, fetchMcpPrompts, apiGroups]);

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
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tools
              {mcpTools.length > 0 && (
                <span className="bg-primary/20 ml-1 rounded-full px-2 py-0.5 text-xs">
                  {mcpTools.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Resources
              {mcpResources.length > 0 && (
                <span className="bg-primary/20 ml-1 rounded-full px-2 py-0.5 text-xs">
                  {mcpResources.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Prompts
              {mcpPrompts.length > 0 && (
                <span className="bg-primary/20 ml-1 rounded-full px-2 py-0.5 text-xs">
                  {mcpPrompts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-6">
            <ToolsList
              tools={mcpTools}
              onAddEndpoints={onAddEndpoints}
              onDeleteTool={onDeleteTool}
              onDeleteAllTools={onDeleteAllTools}
            />
          </TabsContent>

          <TabsContent value="resources" className="mt-6">
            <ResourcesList resources={mcpResources} />
          </TabsContent>

          <TabsContent value="prompts" className="mt-6">
            <PromptsList prompts={mcpPrompts} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
