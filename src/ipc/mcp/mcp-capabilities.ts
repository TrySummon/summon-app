import { runningMcpServers } from "@/lib/mcp/state";

/**
 * Fetches tools from an MCP server using the provided configuration
 * @param mcpId ID of the MCP server
 * @returns A promise that resolves to an array of MCP tools
 */
export async function getMcpTools(mcpId: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  return (await serverState.client.listTools()).tools;
}

/**
 * Fetches prompts from an MCP server using the provided configuration
 * @param mcpId ID of the MCP server
 * @returns A promise that resolves to an array of MCP prompts
 */
export async function getMcpPrompts(mcpId: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  try {
    return (await serverState.client.listPrompts()).prompts;
  } catch (error) {
    // If the server doesn't support prompts, return empty array
    if (error instanceof Error && error.message.includes("Method not found")) {
      return [];
    }
    throw error;
  }
}

/**
 * Fetches resources from an MCP server using the provided configuration
 * @param mcpId ID of the MCP server
 * @returns A promise that resolves to an array of MCP resources
 */
export async function getMcpResources(mcpId: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  try {
    return (await serverState.client.listResources()).resources;
  } catch (error) {
    // If the server doesn't support resources, return empty array
    if (error instanceof Error && error.message.includes("Method not found")) {
      return [];
    }
    throw error;
  }
}

export async function callMcpTool(
  mcpId: string,
  name: string,
  args: Record<string, unknown>,
) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  const result = await serverState.client.callTool({
    name: name,
    arguments: args,
  });
  return result;
}
