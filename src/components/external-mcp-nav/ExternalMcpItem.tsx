import React, { useMemo } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/utils/tailwind";
import { toast } from "sonner";
import { ExternalMcpRoute } from "@/routes/routes";
import { ExternalMcpDropdownMenu } from "./ExternalMcpDropdownMenu";
import { useMcpServerState } from "@/hooks/useMcpServerState";

interface ExternalMcpItemProps {
  mcpId: string;
}

export function ExternalMcpItem({
  mcpId,
}: ExternalMcpItemProps) {
    const { state, startServer, stopServer } = useMcpServerState(mcpId, true);
  
  // Check if this MCP is currently selected/active using URL pattern matching
  const location = useLocation();
  const isActive = useMemo(() => {
    const match = location.pathname.match(/\/external-mcp\/([^/]+)/);
    return match ? match[1] === mcpId : false;
  }, [location.pathname, mcpId]);
  
  // Determine status indicator color
  const getStatusColor = () => {
    switch (state?.status) {
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
    switch (state?.status) {
      case "running":
        return "MCP server is connected";
      case "starting":
        return "MCP server is connecting";
      case "error":
        return "MCP server encountered an error";
      case "stopped":
        return "MCP server is disconnected";
      default:
        return "MCP server status unknown";
    }
  };

  return (
    <SidebarMenuItem>
      <Link 
        to={ExternalMcpRoute.to}
        params={{ mcpId }}
      >
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
              {mcpId}
            </span>
          </div>
        </SidebarMenuButton>
      </Link>
      
      <ExternalMcpDropdownMenu
        mcpId={mcpId}
        status={state?.status}
        onConnect={startServer}
        onDisconnect={stopServer}
      />
    </SidebarMenuItem>
  );
}
