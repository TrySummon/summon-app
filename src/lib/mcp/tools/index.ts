import { addMcpLog } from "..";
import { runningMcpServers } from "../state";

// Central export for all tool-related functionality
export * from "./types";
export * from "./fetcher";
export * from "./optimizer";
export * from "./persistence";

export async function callMcpTool(
  mcpId: string,
  name: string,
  args: Record<string, unknown>,
) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState || !serverState.client) {
    throw new Error(`MCP server ${mcpId} is not running`);
  }

  const client = serverState.client;

  // Log the detailed request
  const truncatedArgs =
    JSON.stringify(args).length > 500
      ? JSON.stringify(args).substring(0, 500) + "..."
      : JSON.stringify(args);
  addMcpLog(
    mcpId,
    "debug",
    `→ Calling tool: ${name} with args: ${truncatedArgs}`,
    serverState.isExternal,
  );

  const result = await client.callTool({
    name,
    arguments: args,
  });

  return result;
}
