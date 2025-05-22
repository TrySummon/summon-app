import React from "react";
import { Link } from "@tanstack/react-router";
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { McpDropdownMenu } from "@/components/mcp-nav/McpDropdownMenu";
import { toast } from "sonner";
import { McpData } from "@/helpers/db/mcp-db";

interface McpItemProps {
  mcpItem: McpData;
  deleteMcp: (mcpId: string, options: any) => void;
}

export function McpItem({
  mcpItem,
  deleteMcp,
}: McpItemProps) {
  // No state needed for edit functionality

  // Handle delete MCP
  const handleDeleteMcp = (mcpId: string, mcpName: string) => {
    if (confirm(`Are you sure you want to delete the MCP "${mcpName}"?`)) {
      deleteMcp(mcpId, {
        onSuccess: () => {
          toast.success(`MCP "${mcpName}" deleted successfully`);
        },
        onError: (error: unknown) => {
          toast.error(`Failed to delete MCP: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    }
  };

  return (
    <SidebarMenuItem>
      <Link to="/build-mcp" search={{ edit: undefined }}>
        <SidebarMenuButton
          className="flex-1 text-xs"
        >
          <div className="flex items-center">
                <span className="cursor-pointer hover:text-primary transition-colors">
                  {mcpItem.name}
                </span>
              </div>
            </SidebarMenuButton>
        </Link>
        
        <McpDropdownMenu
          mcpId={mcpItem.id}
          mcpName={mcpItem.name}
          onDelete={handleDeleteMcp}
        />
      </SidebarMenuItem>
  );
}
