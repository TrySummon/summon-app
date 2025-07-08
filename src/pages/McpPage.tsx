import React, { useCallback } from "react";
import { useParams } from "@tanstack/react-router";
import { useMcp, useMcps } from "@/hooks/useMcps";
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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useApis } from "@/hooks/useApis";
import { ApiConfigs } from "@/components/mcp-builder/api-config";
import { useMcpActions } from "@/hooks/useMcpActions";
import { McpBuilderAgentSidebar } from "@/components/mcp-builder/agent";

export default function McpPage() {
  const { apis } = useApis();
  const { mcpId } = useParams({ from: "/mcp/$mcpId" });
  const { mcp, isLoading } = useMcp(mcpId);
  const { updateMcp } = useMcps();
  const { onAddEndpoints, onDeleteTool, onDeleteAllTools } =
    useMcpActions(mcpId);

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

  if (!mcp && !isLoading) {
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

  if (!mcp) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <SidebarProvider
        className="min-h-full"
        mobileBreakpoint={1}
        defaultWidth="21rem"
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
            <div className="container mx-auto flex max-w-4xl flex-grow flex-col py-6">
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
        <McpBuilderAgentSidebar mcpId={mcpId} />
      </SidebarProvider>
    </div>
  );
}
