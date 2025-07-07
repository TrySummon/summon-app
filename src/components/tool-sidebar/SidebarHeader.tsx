import React from "react";
import { Badge } from "@/components/ui/badge";
import { SidebarHeader as UISidebarHeader } from "@/components/ui/sidebar";
import McpIcon from "../icons/mcp";

interface ToolSidebarHeaderProps {
  toolCount: number;
}

export default function ToolSidebarHeader({
  toolCount,
}: ToolSidebarHeaderProps) {
  return (
    <UISidebarHeader className="border-b px-2 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <McpIcon className="h-4 w-4" />
          <div className="text-sm font-medium">Tools</div>
        </div>
        <Badge className="select-none">{toolCount}</Badge>
      </div>
    </UISidebarHeader>
  );
}
