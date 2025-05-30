import React, { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface ExternalMcpHeaderProps {
  isLoading: boolean;
  refetch: () => void;
}

export function ExternalMcpHeader({ isLoading, refetch }: ExternalMcpHeaderProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleRefresh = () => {
    refetch();
    toast.success("External MCP list refreshed");
  };

  return (
    <div 
      className="flex items-center justify-between"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <SidebarGroupLabel>External MCPs</SidebarGroupLabel>
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
              <p>Refresh External MCP list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/connect-mcp">
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
              <p>Connect new External MCP</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
