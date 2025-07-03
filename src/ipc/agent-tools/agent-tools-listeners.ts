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
import {
  optimizeToolSize,
  optimizeToolSelection,
} from "@/lib/mcp/tools/optimizer";
import type {
  OptimizeToolSizeRequest,
  OptimizeToolSelectionRequest,
} from "@/lib/mcp/tools/types";

export interface SearchApiEndpointsRequest {
  apiId: string;
  query?: string;
  tags?: string[];
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
    async (_, request: OptimizeToolSizeRequest) => {
      return await optimizeToolSize(request);
    },
  );

  // Optimise tool definition selection given context
  ipcMain.handle(
    OPTIMISE_TOOL_SELECTION_CHANNEL,
    async (_, request: OptimizeToolSelectionRequest) => {
      return await optimizeToolSelection(request);
    },
  );
}
