import React, { useState } from "react";
import { Wrench, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ToolInvocation } from "ai";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import { findToolMcpId, makeExecuteFunction } from "@/lib/agent";
import { Loader } from "@/components/Loader";
import { PayloadDialog } from "@/components/ui/PayloadDialog";
import { FixToolCallButton } from "@/components/FixToolCall";

interface ToolCallProps {
  invocation: ToolInvocation;
}

export const ToolCall: React.FC<ToolCallProps> = ({ invocation }) => {
  const toolMap = usePlaygroundStore((state) => state.mcpToolMap);
  const addToolResult = usePlaygroundStore((state) => state.addToolResult);

  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    const mcpId = findToolMcpId(invocation.toolName);
    if (!mcpId) {
      console.error("Could not find mcp id for:", invocation.toolName);
      addToolResult(invocation.toolCallId, {
        success: false,
        message: "Could not find original tool information",
      });
      setLoading(false);
      return;
    }

    try {
      const executeFunction = makeExecuteFunction(
        toolMap,
        mcpId,
        invocation.toolName,
      );
      const result = await executeFunction(invocation.args);
      addToolResult(invocation.toolCallId, result);
    } catch (error) {
      console.error("Error executing approved tool:", error);
      addToolResult(invocation.toolCallId, {
        success: false,
        message: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    addToolResult(invocation.toolCallId, {
      success: false,
      message: "Tool execution was denied by the user",
    });
  };

  // Determine the status badge based on the state
  const renderStatusBadge = () => {
    switch (invocation.state) {
      case "partial-call":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                Pending
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tool call is being prepared and awaiting approval</p>
            </TooltipContent>
          </Tooltip>
        );
      case "call":
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
          >
            Processing
          </Badge>
        );
      case "result":
        if (invocation.result.success) {
          return (
            <Badge
              variant="outline"
              className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            >
              Completed
            </Badge>
          );
        } else {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                >
                  Failed
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tool execution failed or was rejected</p>
              </TooltipContent>
            </Tooltip>
          );
        }
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="group bg-card/30 hover:border-border hover:bg-card/50 relative rounded-lg backdrop-blur-sm transition-all duration-200">
        {/* Header */}
        <div className="border-border/30 flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
              <Wrench className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                {invocation.toolName}
                <FixToolCallButton invocation={invocation} />
              </div>
              <span className="text-muted-foreground text-xs">
                Tool Invocation
              </span>
            </div>
          </div>
          {renderStatusBadge()}
        </div>

        {/* Content */}
        <div className="space-y-3 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <PayloadDialog
              title={`Arguments for ${invocation.toolName}`}
              payload={invocation.args}
              triggerText="Arguments"
            />
            {invocation.state === "result" && (
              <PayloadDialog
                title={`Result for ${invocation.toolName}`}
                payload={invocation.result}
                triggerText="Result"
              />
            )}
          </div>

          {/* Action buttons for pending tools */}
          {invocation.state === "partial-call" && (
            <div className="flex items-center justify-end gap-3 pt-1">
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
    </TooltipProvider>
  );
};

export default ToolCall;
