import React from "react";
import { useParams } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link } from "@tanstack/react-router";
import { Plug } from "lucide-react";
import { NotFound } from "@/components/ui/NotFound";
import { McpExplorer } from "@/components/mcp-explorer";
import { useExternalMcpServerState } from "@/hooks/useExternalMcpServerState";
import { ExternalMcpRoute } from "@/routes/routes";

export default function ExternalMcpPage() {
  const { mcpId } = useParams({ from: ExternalMcpRoute.id });
  const { state, isLoading } = useExternalMcpServerState(mcpId);

  if (!state && !isLoading) {
    return (
      <NotFound
        title="External MCP Not Found"
        message="The External MCP you're looking for doesn't exist or has been disconnected."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "External MCP Not Found", isActive: true },
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
              <BreadcrumbPage>
                <Plug className="mr-2 size-3" />
                External MCPs
              </BreadcrumbPage>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={ExternalMcpRoute.to} params={{ mcpId }}>
                <BreadcrumbPage>{mcpId}</BreadcrumbPage>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="container mx-auto flex max-w-4xl flex-grow flex-col py-6">
          <McpExplorer mcpId={mcpId} mcpName={mcpId} isExternal />
        </div>
      </div>
    </div>
  );
}
