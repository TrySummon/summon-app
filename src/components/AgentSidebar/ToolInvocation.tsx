import React, { useEffect, useRef } from "react";
import { ToolInvocation as AIToolInvocation } from "ai";
import { ReadToolInvocation } from "./ReadToolInvocation";
import { WriteToolInvocation } from "./WriteToolInvocation";
import { useAgentContext } from "./AgentContext";

// New wrapper component that decides which tool component to render
interface ToolInvocationProps {
  toolInvocation: AIToolInvocation;
}

export const ToolInvocation: React.FC<ToolInvocationProps> = ({
  toolInvocation,
}) => {
  const { toolBox, addToolResult } = useAgentContext();
  const processedRef = useRef(false);
  const toolClassification = toolBox.getToolClassification(
    toolInvocation.toolName,
  );

  // Auto-reject unrecognized tools
  useEffect(() => {
    if (
      !toolClassification &&
      toolInvocation.state === "call" &&
      !processedRef.current
    ) {
      processedRef.current = true;
      console.error(`Unrecognized tool: ${toolInvocation.toolName}`);
      addToolResult({
        toolCallId: toolInvocation.toolCallId,
        result: {
          success: false,
          message: `Error: Unrecognized tool "${toolInvocation.toolName}". Tool execution rejected.`,
        },
      });
    }
  }, [
    toolClassification,
    toolInvocation.state,
    toolInvocation.toolCallId,
    toolInvocation.toolName,
    addToolResult,
  ]);

  if (!toolClassification) {
    return (
      <div className="text-xs text-red-600">
        Unrecognized tool: {toolInvocation.toolName}
      </div>
    );
  }

  if (toolClassification.type === "read") {
    return (
      <ReadToolInvocation
        key={toolInvocation.toolCallId}
        toolInvocation={toolInvocation}
        runningText={toolClassification.runningText}
        doneText={toolClassification.doneText}
        errorText={toolClassification.errorText}
      />
    );
  }

  return (
    <WriteToolInvocation
      key={toolInvocation.toolCallId}
      toolInvocation={toolInvocation}
    />
  );
};
