import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignInDialog } from "@/components/SignInDialog";
import { useAuth } from "@/hooks/useAuth";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolAnnotations } from "@/lib/mcp/tools/types";
import { useMcpActions } from "@/hooks/useMcpActions";
import { toast } from "sonner";

interface OptimizeToolButtonProps {
  tool: Tool;
  mcpId: string;
  refreshStatus: () => void;
  className?: string;
}

export function OptimizeToolButton({
  tool,
  mcpId,
  refreshStatus,
  className,
}: OptimizeToolButtonProps) {
  const { user } = useAuth();
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { optimiseToolSize } = useMcpActions(mcpId);

  const handleOptimize = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      setShowSignInDialog(true);
      return;
    }

    const toolAnnotations = tool.annotations as unknown as ToolAnnotations;
    const toolName = tool.name;

    setIsOptimizing(true);

    await toast.promise(
      optimiseToolSize({
        apiId: toolAnnotations.apiId,
        toolName: toolAnnotations.apiId ? toolAnnotations.id : toolName,
      }),
      {
        loading: `Optimizing ${toolName}...`,
        success: (result) => {
          refreshStatus();
          if (!result.success) throw new Error(result.message);
          return result.message || `${toolName} optimized successfully!`;
        },
        error: (error) => error.message || `Failed to optimize ${toolName}`,
        finally: () => {
          setIsOptimizing(false);
        },
      },
    );
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`dark:text-blue-500" h-6 w-6 p-0 text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 ${className}`}
              onClick={handleOptimize}
              disabled={isOptimizing}
              title="Optimize tool"
            >
              <Sparkles className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Optimize tool</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sign in dialog for unauthenticated users */}
      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />
    </>
  );
}
