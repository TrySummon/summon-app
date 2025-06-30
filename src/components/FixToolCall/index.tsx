import React, { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SignInDialog } from "@/components/SignInDialog";
import { useAuth } from "@/hooks/useAuth";
import { ToolInvocation } from "ai";
import { usePlaygroundStore } from "@/stores/playgroundStore";
import { optimiseToolSelection } from "@/ipc/agent-tools/agent-tools-client";
import { toast } from "sonner";
import { cn } from "@/utils/tailwind";
import { ComposerState } from "./ComposerState";
import { LoadingState } from "./LoadingState";
import { MergeView } from "./MergeView";
import type { MentionedTool, OptimizedResult, DialogState } from "./types";
import { SummonTool } from "@/lib/mcp/tool";
import { updateMcpToolWithStoreSync } from "@/ipc/mcp/mcp-client";

interface FixToolCallButtonProps {
  invocation?: ToolInvocation;
}

export function FixToolCallButton({ invocation }: FixToolCallButtonProps) {
  const { user } = useAuth();
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("composer");
  const [optimizedResult, setOptimizedResult] =
    useState<OptimizedResult | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [submittedTools, setSubmittedTools] = useState<MentionedTool[]>([]);

  // Store submitted data for potential reuse
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = { submittedMessage, submittedTools };

  // Get current state from playground store
  const getCurrentState = usePlaygroundStore((state) => state.getCurrentState);

  // Get messages prior to the tool call
  const messagesPriorToToolCall = useMemo(() => {
    if (!invocation?.toolCallId) return [];

    const currentState = getCurrentState();
    const messages = currentState.messages;

    // Find the message that contains this specific tool invocation
    const toolCallMessageIndex = messages.findIndex((message) =>
      message.parts.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolCallId === invocation.toolCallId,
      ),
    );

    // Return all messages prior to the tool call message
    if (toolCallMessageIndex > 0) {
      return messages.slice(0, toolCallMessageIndex);
    }

    return messages;
  }, [invocation?.toolCallId, getCurrentState]);

  const handleClick = () => {
    if (!user) {
      setShowSignInDialog(true);
    } else {
      setShowFixDialog(true);
      setDialogState("composer");
    }
  };

  const handleSubmit = async (
    message: string,
    mentionedTools: MentionedTool[],
  ) => {
    setSubmittedMessage(message);
    setSubmittedTools(mentionedTools);
    setDialogState("loading");

    try {
      // Convert MentionedTool[] to SummonTool[] format expected by the API
      const summonTools: SummonTool[] = mentionedTools.map((tool) => ({
        apiId: tool.apiId,
        mcpId: tool.mcpId,
        isExternal: tool.isExternal,
        definition: tool.definition,
        originalToolName: tool.originalToolName,
      }));

      const result = await optimiseToolSelection({
        context: message,
        messagesPriorToToolCall,
        tools: summonTools,
      });

      if (result.success && result.data) {
        setOptimizedResult(result.data);
        setDialogState("merge");
      } else {
        toast.error(result.message || "Failed to optimize tool selection");
        setDialogState("composer");
      }
    } catch (error) {
      console.error("Error optimizing tool selection:", error);
      toast.error("An error occurred while optimizing tool selection");
      setDialogState("composer");
    }
  };

  const handleApprove = async () => {
    if (!optimizedResult) {
      toast.error("No optimization result available");
      return;
    }

    try {
      const original = optimizedResult.original;
      const optimised = optimizedResult.optimised;
      // Update all optimized tools sequentially to avoid file conflicts
      for (let i = 0; i < original.length; i++) {
        const originalTool = original[i];
        const optimisedTool = optimised[i];
        const result = await updateMcpToolWithStoreSync(
          originalTool.definition.name,
          optimisedTool,
        );
        if (!result.success) {
          throw new Error(
            `Failed to update tool ${originalTool.definition.name}: ${result.message || "Unknown error"}`,
          );
        }
      }

      toast.success("Tool optimization applied!");
      setShowFixDialog(false);
      resetState();
    } catch (error) {
      console.error("Error updating tools:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update tools",
      );
    }
  };

  const handleReject = () => {
    setDialogState("composer");
  };

  const resetState = () => {
    setDialogState("composer");
    setOptimizedResult(null);
    setSubmittedMessage("");
    setSubmittedTools([]);
  };

  const handleDialogClose = (open: boolean) => {
    setShowFixDialog(open);
    if (!open) {
      resetState();
    }
  };

  const renderDialogContent = () => {
    switch (dialogState) {
      case "loading":
        return <LoadingState onCancel={() => setDialogState("composer")} />;

      case "merge":
        if (!optimizedResult) return null;
        return (
          <MergeView
            optimizedResult={optimizedResult}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        );

      default:
        return (
          <ComposerState
            toolName={invocation?.toolName}
            onSubmit={handleSubmit}
          />
        );
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClick}
              className="h-6 w-6"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Fix tool call</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Sign in dialog for unauthenticated users */}
      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
      />

      {/* Fix tool call dialog for authenticated users */}
      <Dialog modal open={showFixDialog} onOpenChange={handleDialogClose}>
        <DialogContent
          className={cn(
            "flex w-[90vw] flex-col transition-all duration-300 ease-in-out sm:max-w-none",
            dialogState === "merge" ? "h-5/6 max-h-5/6" : "h-auto max-h-[80vh]",
          )}
        >
          {dialogState === "loading" ? (
            renderDialogContent()
          ) : (
            <div className="flex flex-1 flex-col opacity-100 transition-opacity duration-300 ease-in-out">
              {renderDialogContent()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
