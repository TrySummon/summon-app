// Tool classification to determine whether tools are read-only or require approval

export interface ToolClassification {
  type: "read" | "write";
  runningText: string;
  doneText: string;
  errorText: string;
}

const toolClassifications: Record<string, ToolClassification> = {
  // Read-only tools (auto-execute)
  listApis: {
    type: "read",
    runningText: "Retrieving available APIs...",
    doneText: "Found APIs",
    errorText: "Failed to retrieve APIs",
  },
  listMcpTools: {
    type: "read",
    runningText: "Listing MCP tools...",
    doneText: "Found MCP tools",
    errorText: "Failed to list MCP tools",
  },
  searchApiEndpoints: {
    type: "read",
    runningText: "Searching API endpoints...",
    doneText: "Found API endpoints",
    errorText: "Failed to search API endpoints",
  },

  // Write tools (require approval)
  addTools: {
    type: "write",
    runningText: "Adding MCP tools...",
    doneText: "Successfully added tools",
    errorText: "Failed to add tools",
  },
  optimiseToolDefinition: {
    type: "write",
    runningText: "Optimising tool definition...",
    doneText: "Optimised tool definition",
    errorText: "Failed to optimise tool definition",
  },
  removeMcpTool: {
    type: "write",
    runningText: "Removing MCP tool...",
    doneText: "Successfully removed tool",
    errorText: "Failed to remove tool",
  },
  removeAllTools: {
    type: "write",
    runningText: "Removing all MCP tools...",
    doneText: "Successfully removed all tools",
    errorText: "Failed to remove tools",
  },
};

export function getToolClassification(
  toolName: string,
): ToolClassification | null {
  return toolClassifications[toolName] || null;
}
