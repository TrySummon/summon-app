import React from "react";
import { useParams } from "@tanstack/react-router";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { McpExplorer } from "@/components/mcp-explorer";
import { useExternalMcpServerState } from "@/hooks/useExternalMcpServerState";
import { ExternalMcpRoute } from "@/routes/routes";

export default function ExternalMcpPage() {
  const { mcpId } = useParams({ from: ExternalMcpRoute.id });
  const { 
    state,
    isLoading, 
    error,
    refreshStatus
  } = useExternalMcpServerState(mcpId);
  
  if (!state && !isLoading) {
    return (
      <NotFound
        title="External MCP Not Found"
        message="The External MCP you're looking for doesn't exist or has been disconnected."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "External MCP Not Found", isActive: true }
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
              <Link to={ExternalMcpRoute.to} params={{mcpId}}>
                <BreadcrumbPage>
                  <Plug className="size-3 mr-2" /> {mcpId}
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
            mcpName={mcpId}
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
