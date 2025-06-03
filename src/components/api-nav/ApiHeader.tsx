import React, { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { SidebarGroupLabel } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ApiHeaderProps {
  isLoading: boolean;
  refetch: () => void;
}

export function ApiHeader({ isLoading, refetch }: ApiHeaderProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleRefresh = () => {
    refetch();
    toast.success("API list refreshed");
  };

  return (
    <div
      className="flex items-center justify-between"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <SidebarGroupLabel>APIs</SidebarGroupLabel>
      <div
        className={`flex items-center transition-opacity ${isHovering ? "opacity-100" : "opacity-0"}`}
      >
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
              <p>Refresh API list</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <ImportApiDialog>
                <Button variant="ghost" size="icon" className="h-5 w-5">
                  <Plus className="h-3 w-3" />
                </Button>
              </ImportApiDialog>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new API</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
