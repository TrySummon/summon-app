import React, { useState } from "react";
import { Clock, Check, Wrench, CheckCircle, XCircle } from "lucide-react";
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
import { findOriginalToolInfo, makeExecuteFunction } from "@/lib/agent";
import { Loader } from "@/components/Loader";
import { PayloadDialog } from "@/components/ui/PayloadDialog";

interface ToolCallProps {
  invocation: ToolInvocation;
}

export const ToolCall: React.FC<ToolCallProps> = ({ invocation }) => {
  const toolMap = usePlaygroundStore((state) => state.mcpToolMap);
  const modifiedToolMap = usePlaygroundStore(
    (state) => state.getCurrentState().modifiedToolMap,
  );
  const addToolResult = usePlaygroundStore((state) => state.addToolResult);

  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    const toolInfo = findOriginalToolInfo(invocation.toolName);
    if (!toolInfo) {
      console.error(
        "Could not find original tool info for:",
        invocation.toolName,
      );
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
        modifiedToolMap,
        toolInfo.mcpId,
        toolInfo.originalToolName,
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
                className="border-yellow-300 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
              >
                <Clock className="mr-1 h-3 w-3" />
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
            className="border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            <Clock className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        );
      case "result":
        if (invocation.result.success) {
          return (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            >
              <Check className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          );
        } else {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
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
      <div className="bg-card flex flex-col gap-2 rounded-md p-2">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex w-full items-center justify-between">
            <div className="text-primary flex items-center gap-2 text-sm font-medium">
              <Wrench className="h-3.5 w-3.5" /> {invocation.toolName}
            </div>
            {renderStatusBadge()}
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center">
          <PayloadDialog
            title={`Arguments for ${invocation.toolName}`}
            payload={invocation.args}
            triggerText="View Arguments"
          />
          {invocation.state === "result" && (
            <PayloadDialog
              title={`Result for ${invocation.toolName}`}
              payload={invocation.result}
              triggerText="View Result"
            />
          )}
        </div>
        {/* Approve/Reject buttons for tools without results */}
        {invocation.state === "partial-call" && (
          <div className="flex justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleReject}
                  size="icon"
                  variant="ghost"
                  className="text-red-600 hover:text-red-500"
                >
                  <XCircle className="h-4 w-4" />
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
                  size="icon"
                  variant="ghost"
                  className="text-green-600 hover:text-green-500"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Approve and execute tool</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ToolCall;
