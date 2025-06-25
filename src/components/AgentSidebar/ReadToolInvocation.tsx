import React, { useCallback, useEffect, useState } from "react";
import { ToolInvocation as AIToolInvocation } from "ai";
import { cn } from "@/utils/tailwind";
import { Eye } from "lucide-react";
import {
  listApiEndpoints,
  listApis,
  readApiEndpoints,
} from "@/ipc/agent-tools/agent-tools-client";
import { useAgentContext } from "./AgentContext";

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
  const { listMcpTools, addToolResult } = useAgentContext();
  const [isError, setIsError] = useState(false);

  const executeReadTool = useCallback(async () => {
    try {
      let result;

      // Execute the appropriate read tool based on the tool name
      switch (toolInvocation.toolName) {
        case "listApis": {
          result = await listApis();
          break;
        }

        case "listApiEndpoint": {
          result = await listApiEndpoints(toolInvocation.args.apiId);
          break;
        }

        case "readApiEndpoints": {
          result = await readApiEndpoints(
            toolInvocation.args.apiId,
            toolInvocation.args.endpoints,
          );
          break;
        }

        case "listMcpTools": {
          result = await listMcpTools(toolInvocation.args.apiId);
          break;
        }

        default:
          throw new Error(`Unknown read tool: ${toolInvocation.toolName}`);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }, [toolInvocation, listMcpTools]);

  // Auto-approve read tools immediately
  useEffect(() => {
    if (
      toolInvocation.state === "call" ||
      toolInvocation.state === "partial-call"
    ) {
      executeReadTool()
        .then((result) => {
          addToolResult({
            toolCallId: toolInvocation.toolCallId,
            result: result,
          });
        })
        .catch((error) => {
          addToolResult({
            toolCallId: toolInvocation.toolCallId,
            result: {
              success: false,
              message: error instanceof Error ? error.message : String(error),
            },
          });
          setIsError(true);
        });
    }
  }, [
    toolInvocation.state,
    toolInvocation.toolCallId,
    executeReadTool,
    addToolResult,
    setIsError,
  ]);

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
        return doneText;
      default:
        return runningText;
    }
  };

  const isRunning =
    toolInvocation.state === "partial-call" || toolInvocation.state === "call";

  return (
    <div className="flex items-center gap-2 py-1">
      <div
        className={cn(
          "text-muted-foreground flex items-center gap-2",
          isRunning && "animate-pulse",
        )}
      >
        <Eye className="h-3.5 w-3.5" />
        <span className={cn("text-xs font-medium", isError && "text-red-600")}>
          {getDisplayText()}
        </span>
      </div>
    </div>
  );
};
