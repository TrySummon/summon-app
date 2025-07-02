import React from "react";
import { RefreshCw, Plus } from "lucide-react";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface McpHeaderProps {
  isLoading: boolean;
  refetch: () => void;
  onCreateMcp: () => void;
}

export function McpHeader({ isLoading, refetch, onCreateMcp }: McpHeaderProps) {
  const handleRefresh = () => {
    refetch();
    toast.success("MCP list refreshed");
  };

  return (
    <div className="flex items-center justify-between">
      <SidebarGroupLabel>My MCPs</SidebarGroupLabel>
      <div className={`flex items-center`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-1 h-5 w-5"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh MCP list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onCreateMcp}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create new MCP</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
