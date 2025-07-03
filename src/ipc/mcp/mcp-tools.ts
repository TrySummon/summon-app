import { runningMcpServers } from "@/lib/mcp/state";
import { calculateTokenCount } from "@/lib/tiktoken";
import { mcpDb } from "@/lib/db/mcp-db";
import { getExternalMcpOverrides, ToolAnnotations } from "@/lib/mcp/tool";
import type { JSONSchema7 } from "json-schema";
import { mapOptimizedToOriginal } from "@/lib/mcp/mapper";

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
          const rootName = t.optimised?.name || t.name;
          const toolNameWithPrefix = apiGroup.toolPrefix
            ? `${apiGroup.toolPrefix}${rootName}`
            : rootName;
          return toolNameWithPrefix === tool.name;
        });
        const annotations = {} as ToolAnnotations;
        if (mcpTool) {
          annotations.prefix = apiGroup.toolPrefix;
          annotations.id = mcpTool.name;
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
      const annotations = {
        isExternal: true,
        id: tool.name,
      } as ToolAnnotations;
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

          annotations.optimisedTokenCount = calculateTokenCount(
            JSON.stringify(override.definition),
          );
        }
      }
      if (annotations.tokenCount === undefined) {
        annotations.tokenCount = calculateTokenCount(
          JSON.stringify(originalDefinition),
        );
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

  // Proxy external MCP calls to the original tool name
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

/**
 * Subscribes to resource updates from an MCP server
 * @param mcpId ID of the MCP server
 * @param uri URI of the resource to subscribe to
 * @returns A promise that resolves when subscription is successful
 */
export async function subscribeMcpResource(mcpId: string, uri: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  // Note: MCP SDK client subscription methods are not yet fully implemented
  // This is a placeholder for future implementation
  throw new Error("Resource subscription not yet implemented");
}

/**
 * Unsubscribes from resource updates from an MCP server
 * @param mcpId ID of the MCP server
 * @param uri URI of the resource to unsubscribe from
 * @returns A promise that resolves when unsubscription is successful
 */
export async function unsubscribeMcpResource(mcpId: string, uri: string) {
  const serverState = runningMcpServers[mcpId];
  if (!serverState) {
    throw new Error(`MCP server with ID ${mcpId} not found`);
  }

  if (!serverState.client) {
    throw new Error(`MCP server with ID ${mcpId} is not running`);
  }

  // Note: MCP SDK client subscription methods are not yet fully implemented
  // This is a placeholder for future implementation
  throw new Error("Resource unsubscription not yet implemented");
}
