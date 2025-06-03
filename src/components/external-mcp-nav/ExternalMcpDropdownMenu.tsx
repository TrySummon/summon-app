import React from "react";
import { MoreHorizontal, Plug, Square, Edit } from "lucide-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { McpServerStatus } from "@/helpers/mcp/state";

interface ExternalMcpDropdownMenuProps {
  status?: McpServerStatus;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function ExternalMcpDropdownMenu({
  status,
  onConnect,
  onDisconnect,
}: ExternalMcpDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover>
          <MoreHorizontal className="h-3 w-3" />
          <span className="sr-only">More</span>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-38" side="right" align="start">
        <Link to="/connect-mcp">
          <DropdownMenuItem className="text-xs">
            <Edit className="text-muted-foreground mr-2 !size-3" />
            <span>Edit</span>
          </DropdownMenuItem>
        </Link>

        {/* Server control actions */}
        {status && (
          <>
            <DropdownMenuSeparator />
            {status === "stopped" || status === "error" ? (
              <DropdownMenuItem className="text-xs" onSelect={onConnect}>
                <Plug className="text-muted-foreground mr-2 !size-3" />
                <span>Connect</span>
              </DropdownMenuItem>
            ) : status === "running" ? (
              <DropdownMenuItem className="text-xs" onSelect={onDisconnect}>
                <Square className="text-muted-foreground mr-2 !size-3" />
                <span>Disconnect</span>
              </DropdownMenuItem>
            ) : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
