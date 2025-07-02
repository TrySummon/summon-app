import { ipcMain } from "electron";
import {
  LIST_APIS_CHANNEL,
  SEARCH_API_ENDPOINTS_CHANNEL,
  OPTIMISE_TOOL_SIZE_CHANNEL,
  OPTIMISE_TOOL_SELECTION_CHANNEL,
} from "./agent-tools-channels";
import { apiDb } from "@/lib/db/api-db";

import { OpenAPIV3 } from "openapi-types";
import log from "electron-log/main";
import { calculateTokenCount } from "@/lib/tiktoken";
import { authStorage } from "../auth/auth-listeners";
import axios from "axios";
import { mcpDb } from "@/lib/db/mcp-db";
import { MappingConfig } from "@/lib/mcp/mapper";
import { Message } from "ai";
import {
  ToolAnnotations,
  updateMcpTool,
  type SummonTool,
  type ToolDefinition,
} from "@/lib/mcp/tool";
import type { JSONSchema7 } from "json-schema";
import { getMcpTools } from "../mcp/mcp-tools";

export interface SearchApiEndpointsRequest {
  apiId: string;
  query?: string;
  tags?: string[];
}

export interface OptimiseToolSizeRequest {
  mcpId: string;
  apiId?: string;
  toolName: string;
  additionalGoal?: string;
}

export interface OptimiseToolSelectionRequest {
  context: string;
  messagesPriorToToolCall: Message[];
  tools: SummonTool[];
}

/**
 * Search and filter endpoints from an OpenAPI spec based on query and tags
 */
function searchEndpoints(
  api: OpenAPIV3.Document,
  query?: string,
  tags?: string[],
) {
  const endpoints: Array<{
    path: string;
    method: string;
    summary?: string;
    description?: string;
    operationId?: string;
    tags?: string[];
  }> = [];

  if (!api.paths) return endpoints;

  for (const [path, pathItem] of Object.entries(api.paths)) {
    if (!pathItem) continue;

    const methods = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "head",
      "options",
      "trace",
    ] as const;

    for (const method of methods) {
      const operation = pathItem[method] as OpenAPIV3.OperationObject;
      if (operation) {
        const endpoint = {
          path,
          method: method,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          tags: operation.tags,
        };

        // Apply filtering
        let shouldInclude = true;

        // Filter by query (search in summary, description, operationId, and path)
        if (query && query.trim()) {
          const searchText = [
            endpoint.summary,
            endpoint.description,
            endpoint.operationId,
            endpoint.path,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          shouldInclude = searchText.includes(query.toLowerCase());
        }

        // Filter by tags
        if (shouldInclude && tags && tags.length > 0) {
          const endpointTags = endpoint.tags || [];
          shouldInclude = tags.some((tag) =>
            endpointTags.some((endpointTag) =>
              endpointTag.toLowerCase().includes(tag.toLowerCase()),
            ),
          );
        }

        if (shouldInclude) {
          endpoints.push(endpoint);
        }
      }
    }
  }

  return endpoints;
}

export function registerAgentToolsListeners() {
  // List all available APIs
  ipcMain.handle(LIST_APIS_CHANNEL, async () => {
    try {
      const apis = await apiDb.listApis();

      // Transform to match the expected format for the agent
      const formattedApis = apis.map(({ id, api }) => ({
        id,
        title: api.info?.title || id,
        description: api.info?.description || "",
        tags: api.tags?.map((tag) => tag.name) || [],
      }));
      const data = JSON.stringify(formattedApis, null, 2);
      const tokenCount = await calculateTokenCount(data);
      return {
        success: true,
        tokenCount,
        data: JSON.stringify(formattedApis, null, 2),
      };
    } catch (error) {
      log.error("Error listing APIs:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Search API endpoints
  ipcMain.handle(
    SEARCH_API_ENDPOINTS_CHANNEL,
    async (_, request: SearchApiEndpointsRequest) => {
      try {
        const { apiId, query, tags } = request;
        const apiData = await apiDb.getApiById(apiId, true);

        if (!apiData) {
          return {
            success: false,
            message: `API with ID ${apiId} not found`,
          };
        }

        const endpoints = searchEndpoints(apiData.api, query, tags);
        const data = JSON.stringify(endpoints, null, 2);
        const tokenCount = await calculateTokenCount(data);

        return {
          success: true,
          tokenCount,
          data,
        };
      } catch (error) {
        log.error(`Error searching endpoints for API ${request.apiId}:`, error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Optimise tool definition size
  ipcMain.handle(
    OPTIMISE_TOOL_SIZE_CHANNEL,
    async (_, request: OptimiseToolSizeRequest) => {
      const { mcpId, apiId, toolName, additionalGoal } = request;
      const authData = await authStorage.getAuthData();
      if (!authData) {
        return { success: false, message: "Not authenticated" };
      }

      const isExternal = !apiId;
      let originalToolDefinition: ToolDefinition;

      if (isExternal) {
        const tools = await getMcpTools(mcpId);
        const tool = tools.find((tool) => tool.name === toolName);
        if (!tool) {
          return {
            success: false,
            message: `Tool with name ${toolName} not found`,
          };
        }

        const annotations = tool.annotations as unknown as ToolAnnotations;

        originalToolDefinition = annotations.originalDefinition || {
          name: tool.name,
          description: tool.description || "",
          inputSchema: tool.inputSchema as unknown as JSONSchema7,
        };
      } else {
        const mcpData = await mcpDb.getMcpById(mcpId);
        if (!mcpData) {
          return {
            success: false,
            message: `MCP with ID ${mcpId} not found`,
          };
        }

        const apiGroup = mcpData.apiGroups[apiId!];
        const tool = apiGroup?.tools?.find(
          (tool) => tool.name === toolName || tool.optimised?.name === toolName,
        );

        if (!tool) {
          return {
            success: false,
            message: `Tool with name ${toolName} not found`,
          };
        }

        originalToolDefinition = {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as unknown as JSONSchema7,
        };
      }

      // Make request to tool design optimization endpoint
      const response = await axios.post(
        `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/optimise-tool-size`,
        {
          originalToolDefinition,
          additionalGoal,
        },
        {
          headers: {
            Authorization: `Bearer ${authData.token}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        },
      );

      // Check if the optimization was successful
      if (
        !response.data?.improvedToolDefinition ||
        !response.data?.mappingConfig
      ) {
        return {
          success: false,
          message:
            "Failed to optimize tool definition - incomplete response from server",
        };
      }

      // Parse the optimized tool definition and mapping config
      let optimizedToolDefinition: ToolDefinition;
      let mappingConfig: MappingConfig;

      try {
        optimizedToolDefinition = JSON.parse(
          response.data.improvedToolDefinition,
        );
        mappingConfig = JSON.parse(response.data.mappingConfig);
      } catch (parseError) {
        return {
          success: false,
          message: `Failed to parse optimization response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
        };
      }

      await updateMcpTool({
        apiId: request.apiId,
        mappingConfig: mappingConfig,
        mcpId: request.mcpId,
        isExternal: isExternal,
        originalToolName: originalToolDefinition.name,
        definition: optimizedToolDefinition,
      });

      const optimisedTokenCount = await calculateTokenCount(
        JSON.stringify(optimizedToolDefinition, null, 2),
      );

      return {
        success: true,
        message: `Tool "${toolName}" has been optimized successfully`,
        tokenCount: optimisedTokenCount,
      };
    },
  );

  // Optimise tool definition selection given context
  ipcMain.handle(
    OPTIMISE_TOOL_SELECTION_CHANNEL,
    async (_, request: OptimiseToolSelectionRequest) => {
      try {
        const { context, messagesPriorToToolCall, tools } = request;

        const authData = await authStorage.getAuthData();
        if (!authData) {
          return { success: false, message: "Not authenticated" };
        }

        const originalTools = tools.map((tool) => tool.definition);

        // Make request to tool design optimization endpoint
        const response = await axios.post(
          `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/optimise-tool-selection`,
          {
            context,
            originalTools,
            messagesPriorToToolCall,
          },
          {
            headers: {
              Authorization: `Bearer ${authData.token}`,
              "Content-Type": "application/json",
            },
            timeout: 60000,
          },
        );

        // Check if the optimization was successful
        if (response.data.success === false) {
          return {
            success: false,
            message:
              "Failed to optimize tool definition: " + response.data.message,
          };
        }

        const result = response.data as {
          originalToolName: string;
          updatedTool: ToolDefinition;
        }[];

        try {
          const optimised = result.map((tool) => {
            const toolDefinition = tool.updatedTool;
            const toolName = tool.originalToolName;
            const toolIndex = tools.findIndex(
              (t) => t.definition.name === toolName,
            );
            if (toolIndex !== -1) {
              return {
                ...tools[toolIndex],
                definition: toolDefinition,
              };
            } else {
              throw new Error(
                `Tool ${toolName} does not exist in the original tools`,
              );
            }
          });

          request.tools.forEach((tool) => {
            delete tool.definition.annotations;
          });

          optimised.forEach((tool) => {
            delete tool.definition.annotations;
          });

          return {
            success: true,
            data: {
              original: request.tools,
              optimised,
            },
          };
        } catch (parseError) {
          return {
            success: false,
            message: `Failed to parse optimization response: ${parseError instanceof Error ? parseError.message : "Unknown parsing error"}`,
          };
        }
      } catch (error) {
        log.error(`Error optimising tool selection:`, error);

        // Handle axios errors
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            message: error.response?.data?.message || error.message,
          };
        }

        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}
