import React, { useCallback, useEffect, useState, useRef } from "react";
import { ToolInvocation as AIToolInvocation } from "ai";
import { cn } from "@/utils/tailwind";
import { Eye } from "lucide-react";
import { useAgentContext } from "./AgentContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CodeEditor from "@/components/CodeEditor";

interface ReadToolInvocationProps {
  toolInvocation: AIToolInvocation;
  runningText: string;
  doneText: string;
  errorText: string;
  addToolResult?: ({
    toolCallId,
    result,
  }: {
    toolCallId: string;
    result: unknown;
  }) => void;
}

export const ReadToolInvocation: React.FC<ReadToolInvocationProps> = ({
  toolInvocation,
  runningText,
  doneText,
  errorText,
}) => {
  const { toolBox, addToolResult } = useAgentContext();
  const [isError, setIsError] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const processedRef = useRef(false);

  // GIGA HACK: Keep a ref to the latest addToolResult function to work around race conditions
  // Sometimes executing tools instantly breaks chat status from "submitted" to "ready"
  // allegedly because of a stale addToolResult function being called
  const addToolResultRef = useRef(addToolResult);
  addToolResultRef.current = addToolResult;

  // Auto-approve read tools with 0ms delay
  // The delay is a workaround to ensure we get the fresh addToolResult function
  useEffect(() => {
    if (toolInvocation.state === "call") {
      const timeoutId = setTimeout(() => {
        if (processedRef.current) {
          return;
        }
        processedRef.current = true;

        (async () => {
          try {
            const result = await toolBox.executeReadTool(toolInvocation);

            addToolResultRef.current({
              toolCallId: toolInvocation.toolCallId,
              result: result,
            });

            if (result.tokenCount) {
              setTokenCount(result.tokenCount);
            }
          } catch (error) {
            console.error("Error executing read tool:", error);
            addToolResultRef.current({
              toolCallId: toolInvocation.toolCallId,
              result: {
                success: false,
                message: error instanceof Error ? error.message : String(error),
              },
            });
            setIsError(true);
          }
        })();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [toolInvocation.state, toolBox, toolInvocation]);

  const getDisplayText = () => {
    switch (toolInvocation.state) {
      case "partial-call":
      case "call":
        return runningText;
      case "result":
        // Check if the result indicates an error
        if (
          typeof toolInvocation.result === "string" &&
          toolInvocation.result.toLowerCase().includes("error")
        ) {
          return errorText;
        }
        return tokenCount ? doneText + ` (${tokenCount} tks)` : doneText;
      default:
        return runningText;
    }
  };

  const isRunning =
    toolInvocation.state === "partial-call" || toolInvocation.state === "call";

  const hasResult =
    toolInvocation.state === "result" && "result" in toolInvocation;

  const handleClick = useCallback(() => {
    if (hasResult) {
      setIsDialogOpen(true);
    }
  }, [hasResult]);

  const getFormattedResult = () => {
    if (toolInvocation.state !== "result" || !("result" in toolInvocation)) {
      return "";
    }

    try {
      return JSON.stringify(toolInvocation.result, null, 2);
    } catch {
      return String(toolInvocation.result);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 py-1">
        <div
          className={cn(
            "text-muted-foreground flex items-center gap-2",
            isRunning && "animate-pulse",
            hasResult &&
              "hover:text-foreground cursor-pointer transition-colors",
          )}
          onClick={handleClick}
        >
          <Eye className="h-3.5 w-3.5" />
          <span
            className={cn("text-xs font-medium", isError && "text-red-600")}
          >
            {getDisplayText()}
          </span>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle>Tool Result: {toolInvocation.toolName}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <CodeEditor
              defaultValue={getFormattedResult()}
              language="json"
              readOnly
              height="60vh"
              className="rounded-md border p-3"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
