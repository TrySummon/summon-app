import React from "react";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Plus } from "lucide-react";
import { useMcps } from "@/hooks/useMcps";
import { McpHeader } from "@/components/mcp-nav/McpHeader";
import { McpItem } from "@/components/mcp-nav/McpItem";
import { Loader } from "@/components/Loader";
import { Link } from "@tanstack/react-router";

export function McpNav() {
  const { mcps, isLoading, error, isError, refetch } = useMcps();

  return (
    <SidebarGroup>
      <McpHeader isLoading={isLoading} refetch={refetch} />
      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <div className="flex items-center justify-center px-2 py-1 text-xs">
              <Loader className="mr-2" /> Loading MCPs...
            </div>
          </SidebarMenuItem>
        ) : isError ? (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs text-red-500">
              Failed to load MCPs. Please try refreshing.
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          </SidebarMenuItem>
        ) : mcps.length === 0 ? (
          <SidebarMenuItem>
            <Link to="/build-mcp" search={{ edit: undefined }}>
              <SidebarMenuButton className="text-xs">
                <Plus className="size-3" /> Create MCP
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ) : (
          <>
            {mcps.map((mcpItem) => (
              <McpItem key={mcpItem.id} mcpItem={mcpItem} />
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
