import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolAnnotations } from "@/lib/mcp/tools/types";
import { toast } from "sonner";
import { revertMcpToolWithStoreSync } from "@/ipc/mcp/mcp-client";

interface RevertToolButtonProps {
  tool: Tool;
  mcpId: string;
  refreshStatus: () => void;
  className?: string;
}

export function RevertToolButton({
  tool,
  mcpId,
  refreshStatus,
  className,
}: RevertToolButtonProps) {
  const [isReverting, setIsReverting] = useState(false);

  const handleRevert = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const toolAnnotations = tool.annotations as unknown as ToolAnnotations;
    const currentToolName = tool.name;

    // Show native confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to revert "${currentToolName}" to its original state? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsReverting(true);

    await toast.promise(
      revertMcpToolWithStoreSync(currentToolName, {
        mcpId,
        apiId: toolAnnotations.apiId,
        isExternal: !!toolAnnotations.isExternal,
        originalToolName: toolAnnotations.id,
      }),
      {
        loading: `Reverting ${currentToolName}...`,
        success: (result) => {
          refreshStatus();
          return result.message || `${currentToolName} reverted successfully!`;
        },
        error: (error) =>
          error.message || `Failed to revert ${currentToolName}`,
        finally: () => {
          setIsReverting(false);
        },
      },
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 text-orange-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-orange-400 ${className}`}
            onClick={handleRevert}
            disabled={isReverting}
            title="Revert tool"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Revert tool</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
