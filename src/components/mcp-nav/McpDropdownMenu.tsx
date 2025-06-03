import React from "react";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";
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

interface McpDropdownMenuProps {
  mcpId: string;
  mcpName: string;
  onDelete: (mcpId: string, mcpName: string) => void;
  status?: McpServerStatus | null;
  onStart?: () => Promise<void>;
  onStop?: () => Promise<void>;
  onRestart?: () => Promise<void>;
}

export function McpDropdownMenu({
  mcpId,
  mcpName,
  onDelete,
  status,
  onStart,
  onStop,
  onRestart,
}: McpDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover>
          <MoreHorizontal className="h-3 w-3" />
          <span className="sr-only">More</span>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-38" side="right" align="start">
        <Link to="/build-mcp" search={{ edit: mcpId }}>
          <DropdownMenuItem className="text-xs">
            <Edit className="text-muted-foreground mr-2 !size-3" />
            <span>Edit MCP</span>
          </DropdownMenuItem>
        </Link>

        {/* Server control actions */}
        {status && onStart && onStop && onRestart && (
          <>
            <DropdownMenuSeparator />
            {status === "stopped" || status === "error" ? (
              <DropdownMenuItem className="text-xs" onSelect={onStart}>
                <Play className="text-muted-foreground mr-2 !size-3" />
                <span>Start Server</span>
              </DropdownMenuItem>
            ) : status === "running" ? (
              <>
                <DropdownMenuItem className="text-xs" onSelect={onStop}>
                  <Square className="text-muted-foreground mr-2 !size-3" />
                  <span>Stop Server</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs" onSelect={onRestart}>
                  <RefreshCw className="text-muted-foreground mr-2 !size-3" />
                  <span>Restart Server</span>
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs"
          onSelect={() => onDelete(mcpId, mcpName)}
        >
          <Trash2 className="text-muted-foreground mr-2 !size-3" />
          <span>Delete MCP</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
