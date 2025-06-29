import { runningMcpServers } from "@/lib/mcp/state";
import { calculateTokenCount } from "@/lib/tiktoken";
import { mcpDb } from "@/lib/db/mcp-db";
import { getExternalMcpOverrides } from "@/lib/mcp/tool";

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

  // Get MCP data for non-external MCPs to check for optimized tools
  let mcpData = null;
  let externalToolOverrides = null;
  if (!serverState.isExternal) {
    mcpData = await mcpDb.getMcpById(mcpId);
  } else {
    externalToolOverrides = await getExternalMcpOverrides(mcpId);
  }

  const response = await serverState.client.listTools();

  const tools = response.tools;

  tools.forEach((tool) => {
    tool.annotations = {};

    // For non-external MCPs, check if tool is optimized and add optimisedTokenCount
    if (mcpData) {
      // Look for the tool in all API groups to find if it's optimized
      for (const apiGroup of Object.values(mcpData.apiGroups)) {
        const mcpTool = apiGroup.tools?.find((t) => {
          // Match by name, considering tool prefix
          const toolNameWithPrefix = apiGroup.toolPrefix
            ? `${apiGroup.toolPrefix}${t.name}`
            : t.name;
          return toolNameWithPrefix === tool.name;
        });

        if (mcpTool?.optimisedTokenCount) {
          tool.annotations.tokenCount = mcpTool.originalTokenCount;
          tool.annotations.optimisedTokenCount = mcpTool.optimisedTokenCount;
        }

        if (mcpTool?.optimised) {
          tool.annotations.originalDefinition = {
            name: mcpTool.name,
            description: mcpTool.description,
            inputSchema: mcpTool.inputSchema,
          };
        }

        if (mcpTool) break;
      }
    } else {
      if (externalToolOverrides) {
        const override = externalToolOverrides[tool.name];
        if (override) {
          tool.name = override.definition.name;
          tool.description = override.definition.description;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool.inputSchema = override.definition.inputSchema as any;
          tool.annotations.isExternal = true;
          tool.annotations.originalDefinition = {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          };
        }
      }
      if (tool.annotations.tokenCount === undefined) {
        tool.annotations.tokenCount = calculateTokenCount(JSON.stringify(tool));
      }
    }
  });

  return tools;
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
