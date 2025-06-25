import React, { useState, useEffect } from "react";
import { ToolInvocation as AIToolInvocation } from "ai";
import { Wrench, Clock, Check, CheckCircle, XCircle } from "lucide-react";
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
      case "call":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="border-yellow-300 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
              >
                <Clock className="mr-1 h-3 w-3" />
                Pending
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tool call is awaiting approval</p>
            </TooltipContent>
          </Tooltip>
        );

      case "result":
        return (
          <Badge
            variant="outline"
            className="border-green-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
          >
            <Check className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dark:bg-sidebar-accent/50 bg-card/50 rounded-md p-2">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex w-full items-center justify-between">
          <div className="text-primary flex items-center gap-2 text-sm font-medium">
            <Wrench className="h-3.5 w-3.5" /> {toolInvocation.toolName}
          </div>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center">
        <PayloadDialog
          title={`Arguments for ${toolInvocation.toolName}`}
          payload={toolInvocation.args}
          triggerText="View Arguments"
        />
        {toolInvocation.state === "result" && (
          <PayloadDialog
            title={`Result for ${toolInvocation.toolName}`}
            payload={toolInvocation.result}
            triggerText="View Result"
          />
        )}
      </div>

      {/* Approve/Reject buttons for tools without results */}
      {toolInvocation.state === "call" && (
        <div className="mt-2 flex justify-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleReject}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-500"
              >
                <XCircle className="mr-1 h-4 w-4" />
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
                variant="ghost"
                className="text-green-600 hover:text-green-500"
                disabled={loading}
              >
                {loading ? (
                  <Loader className="mr-1 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-1 h-4 w-4" />
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
  );
};
