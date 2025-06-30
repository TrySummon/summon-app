import React, { useState, useEffect } from "react";
import { ToolInvocation as AIToolInvocation } from "ai";
import { Wrench, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader } from "../Loader";
import { useAgentContext } from "./AgentContext";
import { PayloadDialog } from "@/components/ui/PayloadDialog";

interface WriteToolInvocationProps {
  toolInvocation: AIToolInvocation;
}

export const WriteToolInvocation: React.FC<WriteToolInvocationProps> = ({
  toolInvocation,
}) => {
  const [loading, setLoading] = useState(false);
  const {
    addToolsToMcp,
    removeMcpTool,
    removeAllMcpTools,
    addToolResult,
    optimiseToolSize,
    autoApprove,
  } = useAgentContext();

  const handleApprove = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      let result;

      // Execute the appropriate tool based on the tool name
      switch (toolInvocation.toolName) {
        case "addTools": {
          result = await addToolsToMcp(toolInvocation.args.selectedEndpoints);
          break;
        }

        case "optimiseToolSize": {
          result = await optimiseToolSize(toolInvocation.args);
          break;
        }

        case "removeMcpTool": {
          result = await removeMcpTool(
            toolInvocation.args.apiId,
            toolInvocation.args.toolName,
          );
          break;
        }

        case "removeAllTools": {
          result = await removeAllMcpTools(toolInvocation.args.apiId);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${toolInvocation.toolName}`);
      }

      addToolResult({
        toolCallId: toolInvocation.toolCallId,
        result,
      });
    } catch (error) {
      console.error("Error executing tool:", error);
      addToolResult({
        toolCallId: toolInvocation.toolCallId,
        result: {
          success: false,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    if (!addToolResult) return;
    addToolResult({
      toolCallId: toolInvocation.toolCallId,
      result: {
        success: false,
        message: "Tool execution was denied by the user",
      },
    });
  };

  // Auto-approve effect for when autoApprove is enabled
  useEffect(() => {
    if (autoApprove && toolInvocation.state === "call" && !loading) {
      handleApprove();
    }
  }, [autoApprove, toolInvocation.state, loading]);

  const renderStatusBadge = () => {
    switch (toolInvocation.state) {
      case "result":
        // Check if the result indicates failure
        if (
          toolInvocation.result &&
          typeof toolInvocation.result === "object" &&
          "success" in toolInvocation.result &&
          toolInvocation.result.success === false
        ) {
          return (
            <Badge
              variant="outline"
              className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              Failed
            </Badge>
          );
        }

        return (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          >
            Completed
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
          >
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="group border-border/50 bg-card/30 hover:border-border hover:bg-card/50 relative rounded-lg border backdrop-blur-sm transition-all duration-200 hover:shadow-sm">
      {/* Header */}
      <div className="border-border/30 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
            <Wrench className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-medium">
              {toolInvocation.toolName}
            </span>
            <span className="text-muted-foreground text-xs">
              Tool Invocation
            </span>
          </div>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Content */}
      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap gap-3">
          <PayloadDialog
            title={`Arguments for ${toolInvocation.toolName}`}
            payload={toolInvocation.args}
            triggerText="Arguments"
          />
          {toolInvocation.state === "result" && (
            <PayloadDialog
              title={`Result for ${toolInvocation.toolName}`}
              payload={toolInvocation.result}
              triggerText="Result"
            />
          )}
        </div>

        {/* Action buttons for pending tools */}
        {toolInvocation.state === "call" && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleReject}
                  size="sm"
                  variant="outline"
                  className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                >
                  <XCircle className="mr-1.5 h-3 w-3" />
                  Reject
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reject and deny tool execution</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleApprove}
                  size="sm"
                  className="h-8 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="mr-1.5 h-3 w-3 text-white" />
                  ) : (
                    <CheckCircle className="mr-1.5 h-3 w-3" />
                  )}
                  Approve
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Approve and execute tool</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
};
