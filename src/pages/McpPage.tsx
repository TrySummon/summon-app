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
  const { 
    state,
    isLoading, 
    error,
    refreshStatus
  } = useMcpServerState(mcpId);
  
  const mcp = mcps.find(m => m.id === mcpId);
  
  if (!mcp) {
    return (
      <NotFound
        title="MCP Not Found"
        message="The MCP you're looking for doesn't exist or has been removed."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "MCP Not Found", isActive: true }
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/mcp/$mcpId" params={{mcpId: mcp.id}}>
                <BreadcrumbPage>
                  <Server className="size-3 mr-2" /> {mcp.name}
                </BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
 
      <div className="flex flex-col overflow-y-auto flex-1">
        <div className="container py-6 max-w-4xl mx-auto">
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
