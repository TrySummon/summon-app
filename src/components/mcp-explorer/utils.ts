import { Tool } from "@modelcontextprotocol/sdk/types";

// Helper function to extract parameters from a tool's inputSchema
export const extractToolParameters = (tool: Tool) => {
  // Check if inputSchema exists and has properties
  if (!tool.inputSchema || !tool.inputSchema.properties) return [];
  
  const properties = tool.inputSchema.properties;
  const required = tool.inputSchema.required || [];
  
  return Object.entries(properties).map(([name, prop]) => ({
    name,
    description: (prop as any).description,
    type: (prop as any).type,
    required: required.includes(name),
    schema: prop as any,
    properties: (prop as any).properties
  }));
};
