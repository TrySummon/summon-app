import { runningMcpServers } from "../state";

/**
 * Fetches resources from an MCP server
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

  const response = await serverState.client.listResources();
  return response.resources;
}

/**
 * Reads a specific resource from an MCP server
 * @param mcpId ID of the MCP server
 * @param uri URI of the resource to read
 * @returns A promise that resolves to the resource content
 */
export async function readMcpResource(mcpId: string, uri: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  const result = await serverState.client.readResource({
    uri: uri,
  });
  return result;
}
