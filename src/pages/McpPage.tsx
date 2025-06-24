import React, { useCallback } from "react";
import { useParams } from "@tanstack/react-router";
import { useMcps } from "@/hooks/useMcps";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Server } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { McpExplorer } from "@/components/mcp-explorer";
import { AgentSidebar } from "@/components/AgentSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useApis } from "@/hooks/useApis";
import {
  convertEndpointsToTools,
  SelectedEndpoint,
} from "@/lib/mcp/parser/extract-tools";
import { toast } from "sonner";
import { ApiConfigs } from "@/components/mcp-builder/api-config";

export default function McpPage() {
  const { apis, refetch: refetchApis } = useApis();
  const { mcpId } = useParams({ from: "/mcp/$mcpId" });
  const { mcps, updateMcp } = useMcps();
  const mcp = mcps.find((m) => m.id === mcpId);

  const onAddEndpoints = useCallback(
    (apiId: string, endpoints: SelectedEndpoint[]) => {
      if (!mcp) return;
      const api = apis.find((a) => a.id === apiId);
      if (!api) return;
      const tools = convertEndpointsToTools(api.api, endpoints);

      // Get all existing tool names across all API groups
      const existingToolNames = new Set<string>();
      Object.values(mcp.apiGroups).forEach((group) => {
        group.tools?.forEach((tool) => {
          existingToolNames.add(tool.name);
        });
      });

      // Filter out duplicate tools and warn about them
      const newTools = tools.filter((tool) => {
        if (existingToolNames.has(tool.name)) {
          toast.info(
            `Duplicate tool name found: "${tool.name}". Skipping this tool.`,
          );
          return false;
        }
        return true;
      });

      // Only proceed if we have new tools to add
      if (newTools.length === 0) {
        toast.info("No new tools to add - all tools were duplicates.");
        return;
      }

      const nextApiGroups = { ...mcp.apiGroups };

      // Create default API group if it doesn't exist
      if (!nextApiGroups[apiId]) {
        const apiName = api.api?.info?.title || "api";
        const toolPrefix = apiName.trim().split(" ")[0].toLowerCase() + "-";

        nextApiGroups[apiId] = {
          name: apiName,
          useMockData: true,
          toolPrefix,
          auth: { type: "noAuth" },
          tools: [],
        };
      }

      nextApiGroups[apiId] = {
        ...nextApiGroups[apiId],
        tools: [...(nextApiGroups[apiId]?.tools || []), ...newTools],
      };

      updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });
    },
    [mcp, apis, updateMcp],
  );

  const onDeleteTool = useCallback(
    (toolName: string) => {
      if (!mcp) return;

      // Find and remove the tool from all API groups
      let toolFound = false;
      const nextApiGroups = { ...mcp.apiGroups };
      Object.keys(nextApiGroups).forEach((apiId) => {
        const group = nextApiGroups[apiId];
        const prefix = group.toolPrefix || "";
        toolName = toolName.startsWith(prefix)
          ? toolName.replace(prefix, "")
          : toolName;
        if (group.tools) {
          // Check for both the exact tool name and the tool name with prefix removed
          const toolIndex = group.tools.findIndex((tool) => {
            return tool.name === toolName;
          });

          if (toolIndex !== -1) {
            toolFound = true;
            const updatedTools = group.tools.filter((tool) => {
              // Match against the original tool name (without prefix)
              const originalToolName =
                prefix && tool.name.startsWith(prefix)
                  ? tool.name.substring(prefix.length)
                  : tool.name;
              return originalToolName !== toolName && tool.name !== toolName;
            });

            // If no tools left after deletion, remove the entire API group
            if (updatedTools.length === 0) {
              delete nextApiGroups[apiId];
            } else {
              nextApiGroups[apiId] = {
                ...group,
                tools: updatedTools,
              };
            }
          }
        }
      });

      if (!toolFound) {
        console.warn(`Tool "${toolName}" not found in any API group.`);
        return;
      }

      updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });
    },
    [mcp, updateMcp],
  );

  const onDeleteAllTools = useCallback(() => {
    if (!mcp) return;

    // Remove all API groups since deleting all tools would leave them empty
    updateMcp({
      mcpId: mcp.id,
      mcpData: {
        ...mcp,
        apiGroups: {},
      },
    });
  }, [mcp, updateMcp]);

  const onUpdateApiConfigs = useCallback(
    async (configData: ApiConfigs) => {
      if (!mcp) return;

      // Update MCP with new configuration
      const nextApiGroups = { ...mcp.apiGroups };

      // Update each API group with new auth and tool prefix configuration
      Object.entries(configData).forEach(([apiId, config]) => {
        if (nextApiGroups[apiId]) {
          nextApiGroups[apiId] = {
            ...nextApiGroups[apiId],
            serverUrl: config.serverUrl,
            useMockData: config.useMockData,
            toolPrefix: config.toolPrefix,
            auth: config.auth,
          };
        }
      });

      await updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });
    },
    [mcp, updateMcp],
  );

  const onEditName = useCallback(
    async (newName: string) => {
      if (!mcp) return;

      await updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          name: newName,
        },
      });
    },
    [mcp, updateMcp],
  );

  if (!apis) return null;

  if (!mcp) {
    return (
      <NotFound
        title="MCP Not Found"
        message="The MCP you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "MCP Not Found", isActive: true },
        ]}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <SidebarProvider
        className="min-h-full"
        mobileBreakpoint={1}
        defaultWidth="28rem"
      >
        <SidebarInset className="flex min-h-0 flex-1 flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <BreadcrumbPage>
                    <Server className="mr-2 size-3" />
                    My MCPs
                  </BreadcrumbPage>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/mcp/$mcpId" params={{ mcpId: mcp.id }}>
                    <BreadcrumbPage>{mcp.name}</BreadcrumbPage>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="container mx-auto max-w-4xl py-6">
              <McpExplorer
                mcpId={mcp.id}
                mcpName={mcp.name}
                onAddEndpoints={onAddEndpoints}
                onDeleteTool={onDeleteTool}
                onDeleteAllTools={onDeleteAllTools}
                onUpdateApiConfigs={onUpdateApiConfigs}
                onEditName={onEditName}
                apiGroups={mcp.apiGroups}
              />
            </div>
          </div>
        </SidebarInset>
        <AgentSidebar mcp={mcp} apis={apis} onRefreshApis={refetchApis} />
      </SidebarProvider>
    </div>
  );
}
