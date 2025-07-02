import React from "react";
import { Badge } from "@/components/ui/badge";
import { SidebarHeader as UISidebarHeader } from "@/components/ui/sidebar";
import SidebarTrigger from "./Trigger";

interface ToolSidebarHeaderProps {
  toolCount: number;
}

export default function ToolSidebarHeader({
  toolCount,
}: ToolSidebarHeaderProps) {
  return (
    <UISidebarHeader className="border-b px-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <SidebarTrigger showOnlyOnDesktop className="-ml-1.5" />
          <div className="text-sm font-medium">Enabled Tools</div>
        </div>
        <Badge className="select-none">{toolCount}</Badge>
      </div>
    </UISidebarHeader>
  );
}
