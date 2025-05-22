import React from "react";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { SidebarMenuAction } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

interface McpDropdownMenuProps {
  mcpId: string;
  mcpName: string;
  onDelete: (mcpId: string, mcpName: string) => void;
}

export function McpDropdownMenu({
  mcpId,
  mcpName,
  onDelete
}: McpDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction showOnHover>
          <MoreHorizontal className="h-3 w-3" />
          <span className="sr-only">More</span>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-38"
        side="right"
        align="start"
      >
        <Link to="/build-mcp" search={{ edit: mcpId }}>
        <DropdownMenuItem 
          className="text-xs" 
        >
          <Edit className="mr-2 !size-3 text-muted-foreground" />
          <span>Edit MCP</span>
        </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-xs" 
          onSelect={() => onDelete(mcpId, mcpName)}
        >
          <Trash2 className="mr-2 !size-3 text-muted-foreground" />
          <span>Delete MCP</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
