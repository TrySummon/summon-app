import { runningMcpServers } from "@/lib/mcp/state";
import { calculateTokenCount } from "@/lib/tiktoken";
import { mcpDb } from "@/lib/db/mcp-db";
import { getExternalMcpOverrides, ToolAnnotations } from "@/lib/mcp/tool";
import type { JSONSchema7 } from "json-schema";

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
        const annotations = {} as ToolAnnotations;
        if (mcpTool) {
          annotations.apiId = mcpTool.apiId;
          annotations.tokenCount = mcpTool.originalTokenCount;
        }
        if (mcpTool?.optimisedTokenCount) {
          annotations.optimisedTokenCount = mcpTool.optimisedTokenCount;
        }

        if (mcpTool?.optimised) {
          annotations.originalDefinition = {
            name: mcpTool.name,
            description: mcpTool.description,
            inputSchema: mcpTool.inputSchema as JSONSchema7,
          };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool.annotations = annotations as any;

        if (mcpTool) break;
      }
    } else {
      const annotations = {} as ToolAnnotations;
      if (externalToolOverrides) {
        const override = externalToolOverrides[tool.name];

        if (override) {
          annotations.isExternal = true;
          annotations.originalDefinition = {
            name: tool.name,
            description: tool.description || "",
            inputSchema: tool.inputSchema as JSONSchema7,
          };
          tool.name = override.definition.name;
          tool.description = override.definition.description;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool.inputSchema = override.definition.inputSchema as any;
        }
      }
      if (annotations.tokenCount === undefined) {
        annotations.tokenCount = calculateTokenCount(JSON.stringify(tool));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tool.annotations = annotations as any;
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
