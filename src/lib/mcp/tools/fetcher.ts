import { runningMcpServers } from "@/lib/mcp/state";
import { calculateTokenCount } from "@/lib/tiktoken";
import { mcpDb, type McpData } from "@/lib/db/mcp-db";
import { mapOptimizedToOriginal } from "@/lib/mcp/tools/mapper";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { JSONSchema7 } from "json-schema";
import type { ToolAnnotations, ExternalToolOverride } from "./types";
import { getExternalMcpOverrides } from "./persistence";

/**
 * Fetches tools from an MCP server
 * @param mcpId ID of the MCP server
 * @returns A promise that resolves to an array of MCP tools
 */
export async function getMcpTools(mcpId: string): Promise<Tool[]> {
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

  // Annotate tools with metadata
  for (const tool of tools) {
    const annotations = await buildToolAnnotations(
      tool,
      mcpId,
      mcpData,
      externalToolOverrides,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tool.annotations = annotations as any;
  }

  return tools;
}

/**
 * Build annotations for a tool based on MCP data and overrides
 */
async function buildToolAnnotations(
  tool: Tool,
  mcpId: string,
  mcpData: McpData | null,
  externalToolOverrides: Record<string, ExternalToolOverride> | null,
): Promise<ToolAnnotations> {
  const annotations: ToolAnnotations = {
    id: tool.name,
  };

  if (mcpData) {
    // For non-external MCPs, check if tool is optimized
    for (const apiGroup of Object.values(mcpData.apiGroups)) {
      const mcpTool = apiGroup.tools?.find((t) => {
        const rootName = t.optimised?.name || t.name;
        const toolNameWithPrefix = apiGroup.toolPrefix
          ? `${apiGroup.toolPrefix}${rootName}`
          : rootName;
        return toolNameWithPrefix === tool.name;
      });

      if (mcpTool) {
        annotations.prefix = apiGroup.toolPrefix;
        annotations.id = mcpTool.name;
        annotations.apiId = mcpTool.apiId;
        annotations.tokenCount = mcpTool.originalTokenCount;

        if (mcpTool.optimisedTokenCount) {
          annotations.optimisedTokenCount = mcpTool.optimisedTokenCount;
        }

        if (mcpTool.optimised) {
          annotations.originalDefinition = {
            name: mcpTool.name,
            description: mcpTool.description,
            inputSchema: mcpTool.inputSchema as JSONSchema7,
          };
        }
        break;
      }
    }
  } else {
    // External MCP tool handling
    annotations.isExternal = true;

    const originalDefinition = {
      name: tool.name,
      description: tool.description || "",
      inputSchema: tool.inputSchema as JSONSchema7,
    };

    if (externalToolOverrides) {
      const override = externalToolOverrides[tool.name];
      if (override) {
        annotations.originalDefinition = originalDefinition;
        tool.name = override.definition.name;
        tool.description = override.definition.description;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool.inputSchema = override.definition.inputSchema as any;

        annotations.optimisedTokenCount = await calculateTokenCount(
          JSON.stringify(override.definition),
        );
      }
    }

    if (!annotations.tokenCount) {
      annotations.tokenCount = await calculateTokenCount(
        JSON.stringify(originalDefinition),
      );
    }
  }

  return annotations;
}

/**
 * Call a tool on an MCP server
 * @param mcpId ID of the MCP server
 * @param name Name of the tool to call
 * @param args Arguments to pass to the tool
 * @returns Tool execution result
 */
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

  // Handle external MCP tool name mapping and argument transformation
  if (serverState.isExternal) {
    const overrides = await getExternalMcpOverrides(mcpId, false);
    const override = overrides[name];
    if (override) {
      name = override.originalToolName;
      if (override.mappingConfig) {
        args = mapOptimizedToOriginal(args, override.mappingConfig);
      }
    }
  }

  const result = await serverState.client.callTool({
    name: name,
    arguments: args,
  });

  return result;
}
