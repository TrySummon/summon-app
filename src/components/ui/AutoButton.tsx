import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface AutoButtonProps {
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}

export function AutoButton({
  isEnabled,
  onToggle,
  disabled = false,
  className,
  size = "sm",
}: AutoButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isEnabled ? "default" : "ghost"}
            size={size}
            onClick={onToggle}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 transition-all duration-200",
              isEnabled && [
                "bg-blue-600 text-white hover:bg-blue-700",
                "dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600",
                "ring-2 ring-blue-200 dark:ring-blue-800",
              ],
              className,
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Auto
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Auto-execute tools: {isEnabled ? "ON" : "OFF"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
