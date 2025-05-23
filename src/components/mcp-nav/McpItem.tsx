import React, { useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { McpDropdownMenu } from "@/components/mcp-nav/McpDropdownMenu";
import { toast } from "sonner";
import { McpData } from "@/helpers/db/mcp-db";
import { useMcpServerStatus } from "@/hooks/useMcpServerStatus";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";

interface McpItemProps {
  mcpItem: McpData;
  deleteMcp: (mcpId: string, options: any) => void;
}

export function McpItem({
  mcpItem,
  deleteMcp,
}: McpItemProps) {
  // Check if this MCP is currently selected/active using URL pattern matching
  const location = useLocation();
  const isActive = useMemo(() => {
    const match = location.pathname.match(/\/mcp\/([^/]+)/);
    return match ? match[1] === mcpItem.id : false;
  }, [location.pathname, mcpItem.id]);
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

  // Use the hook to get server status
  const { status, isLoading: statusLoading, startServer, stopServer, restartServer } = 
    useMcpServerStatus(mcpItem.id);
  
  // Determine status indicator color
  const getStatusColor = () => {
    if (statusLoading) return "bg-gray-300";
    
    switch (status) {
      case "running":
        return "bg-green-500";
      case "starting":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      case "stopped":
      default:
        return "bg-gray-500";
    }
  };
  
  // Get status text for tooltip
  const getStatusText = () => {
    if (statusLoading) return "Checking status...";
    
    switch (status) {
      case "running":
        return "MCP server is running";
      case "starting":
        return "MCP server is starting";
      case "error":
        return "MCP server encountered an error";
      case "stopped":
        return "MCP server is stopped";
      default:
        return "MCP server status unknown";
    }
  };

  return (
    <SidebarMenuItem>
      <Link to="/mcp/$mcpId" params={{ mcpId: mcpItem.id }}>
        <SidebarMenuButton
          className="flex-1 text-xs"
          isActive={isActive}
        >
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-2",
                    getStatusColor()
                  )} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getStatusText()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        status={status}
        onStart={startServer}
        onStop={stopServer}
        onRestart={restartServer}
      />
    </SidebarMenuItem>
  );
}
