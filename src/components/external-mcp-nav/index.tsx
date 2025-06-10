import React from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plug } from "lucide-react";
import { Loader } from "@/components/Loader";
import { Link } from "@tanstack/react-router";
import { ExternalMcpHeader } from "./ExternalMcpHeader";
import { ExternalMcpItem } from "./ExternalMcpItem";
import { useExternalMcps } from "@/hooks/useExternalMcps";

export function ExternalMcpNav() {
  // Use our custom hook that listens for external MCP updates via IPC
  const { externalMcps, isLoading, error, refetch } = useExternalMcps();

  return (
    <SidebarGroup>
      <ExternalMcpHeader isLoading={isLoading} refetch={refetch} />
      <SidebarMenu>
        {isLoading ? (
          <div className="flex justify-center py-2">
            <Loader className="h-4 w-4" />
          </div>
        ) : error ? (
          <div className="px-4 py-2 text-xs text-red-500">
            Error: {error.message}
          </div>
        ) : Object.keys(externalMcps).length === 0 ? (
          <SidebarMenuItem>
            <Link to="/connect-mcp">
              <SidebarMenuButton className="text-xs">
                <Plug className="!size-3" /> Connect MCP
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ) : (
          <>
            {Object.entries(externalMcps).map(([mcpId]) => (
              <ExternalMcpItem key={mcpId} mcpId={mcpId} />
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
