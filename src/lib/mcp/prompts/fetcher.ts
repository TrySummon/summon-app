import { runningMcpServers } from "../state";

/**
 * Fetches prompts from an MCP server
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

  const response = await serverState.client.listPrompts();
  return response.prompts;
}

/**
 * Gets a specific prompt with arguments from an MCP server
 * @param mcpId ID of the MCP server
 * @param name Name of the prompt
 * @param args Arguments for the prompt
 * @returns A promise that resolves to the prompt result
 */
export async function getMcpPrompt(
  mcpId: string,
  name: string,
  args?: Record<string, string>,
) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  const result = await serverState.client.getPrompt({
    name: name,
    arguments: args,
  });
  return result;
}
