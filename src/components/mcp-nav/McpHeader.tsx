import React, { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface McpHeaderProps {
  isLoading: boolean;
  refetch: () => void;
}

export function McpHeader({ isLoading, refetch }: McpHeaderProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleRefresh = () => {
    refetch();
    toast.success("MCP list refreshed");
  };

  return (
    <div 
      className="flex items-center justify-between"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <SidebarGroupLabel>My MCPs</SidebarGroupLabel>
      <div className={`flex items-center transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 mr-1" 
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
              <Link to="/build-mcp" search={{ edit: undefined }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </Link>
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
