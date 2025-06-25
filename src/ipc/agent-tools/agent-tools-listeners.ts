import { ipcMain } from "electron";
import {
  LIST_APIS_CHANNEL,
  LIST_API_ENDPOINTS_CHANNEL,
  READ_API_ENDPOINTS_CHANNEL,
} from "./agent-tools-channels";
import { apiDb } from "@/lib/db/api-db";

import { OpenAPIV3 } from "openapi-types";
import log from "electron-log/main";

interface ListApiEndpointsRequest {
  apiId: string;
}

interface ReadApiEndpointsRequest {
  apiId: string;
  endpoints: Array<{
    path: string;
    method: string;
  }>;
}

/**
 * Extract a flat list of endpoints from an OpenAPI spec
 */
function extractApiEndpoints(api: OpenAPIV3.Document) {
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
        endpoints.push({
          path,
          method: method.toUpperCase(),
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
          tags: operation.tags,
        });
      }
    }
  }

  return endpoints;
}

/**
 * Get detailed definitions for specific endpoints
 */
function readApiEndpointDetails(
  api: OpenAPIV3.Document,
  endpoints: Array<{ path: string; method: string }>,
) {
  const endpointDetails: Array<{
    path: string;
    method: string;
    operation: OpenAPIV3.OperationObject | null;
    pathItem: OpenAPIV3.PathItemObject | null;
  }> = [];

  for (const endpoint of endpoints) {
    const pathItem = api.paths?.[endpoint.path];
    const operation = pathItem?.[
      endpoint.method.toLowerCase() as keyof OpenAPIV3.PathItemObject
    ] as OpenAPIV3.OperationObject | undefined;

    endpointDetails.push({
      path: endpoint.path,
      method: endpoint.method,
      operation: operation || null,
      pathItem: pathItem || null,
    });
  }

  return JSON.stringify(endpointDetails, null, 2);
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

      return {
        success: true,
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

  // List API endpoints
  ipcMain.handle(
    LIST_API_ENDPOINTS_CHANNEL,
    async (_, request: ListApiEndpointsRequest) => {
      try {
        const { apiId } = request;
        const apiData = await apiDb.getApiById(apiId, true);

        if (!apiData) {
          return {
            success: false,
            message: `API with ID ${apiId} not found`,
          };
        }

        const endpoints = extractApiEndpoints(apiData.api);

        return {
          success: true,
          data: JSON.stringify(endpoints, null, 2),
        };
      } catch (error) {
        log.error(`Error listing endpoints for API ${request.apiId}:`, error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Read API endpoint details
  ipcMain.handle(
    READ_API_ENDPOINTS_CHANNEL,
    async (_, request: ReadApiEndpointsRequest) => {
      try {
        const { apiId, endpoints } = request;
        const apiData = await apiDb.getApiById(apiId, true);

        if (!apiData) {
          return {
            success: false,
            message: `API with ID ${apiId} not found`,
          };
        }

        const endpointDetails = readApiEndpointDetails(apiData.api, endpoints);

        return {
          success: true,
          data: JSON.stringify(endpointDetails, null, 2),
        };
      } catch (error) {
        log.error(
          `Error reading endpoint details for API ${request.apiId}:`,
          error,
        );
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );
}
