import { ToolInvocation } from "ai";

export interface ToolClassification {
  type: "read" | "write";
  runningText: string;
  doneText: string;
  errorText: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
  tokenCount?: number;
}

export interface AgentToolBox {
  // Tool classification
  getToolClassification(toolName: string): ToolClassification | null;

  // Tool execution
  executeReadTool(toolInvocation: ToolInvocation): Promise<ToolResult>;
  executeWriteTool(toolInvocation: ToolInvocation): Promise<ToolResult>;
}
