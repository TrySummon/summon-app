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
 * Extract essential parameter information
 */
function extractParameterInfo(
  parameters?: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[],
) {
  if (!parameters) return [];

  return parameters.map((param) => {
    // Handle reference objects by resolving them (simplified for now)
    if ("$ref" in param) {
      return { name: "reference", description: `Reference: ${param.$ref}` };
    }

    const p = param as OpenAPIV3.ParameterObject;
    return {
      name: p.name,
      in: p.in,
      required: p.required || false,
      type: (p.schema as OpenAPIV3.SchemaObject)?.type || "unknown",
      description: p.description,
    };
  });
}

/**
 * Extract simplified request body schema
 */
function extractRequestBodyInfo(
  requestBody?: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject,
) {
  if (!requestBody) return null;

  if ("$ref" in requestBody) {
    return { description: `Reference: ${requestBody.$ref}` };
  }

  const body = requestBody as OpenAPIV3.RequestBodyObject;
  const content = body.content;
  const mediaTypes = Object.keys(content || {});

  return {
    required: body.required || false,
    description: body.description,
    mediaTypes,
  };
}

/**
 * Extract simplified response schema
 */
function extractResponseInfo(responses?: OpenAPIV3.ResponsesObject) {
  if (!responses) return {};

  const responseInfo: Record<
    string,
    {
      description: string;
      mediaTypes?: string[];
    }
  > = {};

  for (const [status, response] of Object.entries(responses)) {
    if ("$ref" in response) {
      responseInfo[status] = { description: `Reference: ${response.$ref}` };
    } else {
      responseInfo[status] = {
        description: response.description,
        mediaTypes: Object.keys(response.content || {}),
      };
    }
  }

  return responseInfo;
}

/**
 * Get detailed definitions for specific endpoints (LLM-optimized)
 */
function readApiEndpointDetails(
  api: OpenAPIV3.Document,
  endpoints: Array<{ path: string; method: string }>,
) {
  const endpointDetails = [];

  for (const endpoint of endpoints) {
    const pathItem = api.paths?.[endpoint.path];
    const operation = pathItem?.[
      endpoint.method.toLowerCase() as keyof OpenAPIV3.PathItemObject
    ] as OpenAPIV3.OperationObject | undefined;

    if (!operation) {
      endpointDetails.push({
        path: endpoint.path,
        method: endpoint.method,
        error: "Operation not found",
      });
      continue;
    }

    // Extract only essential information
    endpointDetails.push({
      path: endpoint.path,
      method: endpoint.method,
      summary: operation.summary,
      description: operation.description,
      operationId: operation.operationId,
      tags: operation.tags,
      parameters: extractParameterInfo(operation.parameters),
      requestBody: extractRequestBodyInfo(operation.requestBody),
      responses: extractResponseInfo(operation.responses),
      security: operation.security,
      deprecated: operation.deprecated,
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
