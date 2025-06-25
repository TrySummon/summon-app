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
  listApiEndpoint: {
    type: "read",
    runningText: "Loading API endpoints...",
    doneText: "Retrieved endpoints",
    errorText: "Failed to load endpoints",
  },
  readApiEndpoints: {
    type: "read",
    runningText: "Reading endpoint details...",
    doneText: "Loaded endpoint details",
    errorText: "Failed to read endpoint details",
  },
  listMcpTools: {
    type: "read",
    runningText: "Listing MCP tools...",
    doneText: "Found MCP tools",
    errorText: "Failed to list MCP tools",
  },

  // Write tools (require approval)
  addTools: {
    type: "write",
    runningText: "Adding MCP tools...",
    doneText: "Successfully added tools",
    errorText: "Failed to add tools",
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
