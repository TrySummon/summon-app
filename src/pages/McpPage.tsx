import React from "react";
import { useParams } from "@tanstack/react-router";
import { useMcps } from "@/hooks/useMcps";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Server } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { McpExplorer } from "@/components/mcp-explorer";
import { useMcpServerState } from "@/hooks/useMcpServerState";

export default function McpPage() {
  const { mcpId } = useParams({ from: "/mcp/$mcpId" });
  const { mcps } = useMcps();
  const { state, isLoading, error, refreshStatus } = useMcpServerState(mcpId);

  const mcp = mcps.find((m) => m.id === mcpId);

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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/mcp/$mcpId" params={{ mcpId: mcp.id }}>
                <BreadcrumbPage>
                  <Server className="mr-2 size-3" /> {mcp.name}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="container mx-auto max-w-4xl py-6">
          <McpExplorer
            mcpId={mcpId}
            mcpName={mcp.name}
            transport={state?.transport}
            status={state?.status}
            error={error}
            isLoading={isLoading}
            refreshStatus={refreshStatus}
          />
        </div>
      </div>
    </div>
  );
}
