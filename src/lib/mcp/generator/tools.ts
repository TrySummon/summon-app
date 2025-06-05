import { McpApiGroup } from "@/lib/db/mcp-db";
import { McpToolDefinition } from "../types";
import { convertEndpointsToTools } from "../parser/extract-tools";
import { kebabCase } from "./utils";
import { extractSecuritySchemes, getEnvVarName } from "./utils/security";
import { getApiById } from "@/lib/db/api-db";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";

export async function generateMcpTools(apiGroups: Record<string, McpApiGroup>) {
  const tools: McpToolDefinition[] = [];

  for (const [apiId, apiGroup] of Object.entries(apiGroups)) {
    // Process endpoints if they exist
    if (apiGroup.endpoints && apiGroup.endpoints.length > 0) {
      const api = await getApiById(apiId);
      if (!api) {
        throw new Error(`API with ID ${apiId} not found`);
      }
      // The MCP generator needs a dereferenced API spec, else the tool description will be wrong
      const apiSpec = (await SwaggerParser.dereference(
        api.originalFilePath,
      )) as OpenAPIV3.Document;

      const dereferencedEndpoints = apiGroup.endpoints.map((endpoint) => {
        const path = apiSpec.paths[endpoint.path];
        const operation = path?.[
          endpoint.method as OpenAPIV3.HttpMethods
        ] as OpenAPIV3.OperationObject;
        operation.parameters = operation.parameters || [];
        if (path?.parameters) {
          operation.parameters.push(...path.parameters);
        }

        return {
          ...endpoint,
          operation: operation,
        };
      });

      // Use extractToolsFromApi to process the endpoints directly
      const extractedTools = convertEndpointsToTools(dereferencedEndpoints);

      // Extract all security schemes from the OpenAPI spec
      const allSecuritySchemes = extractSecuritySchemes(apiSpec, apiGroup.name);

      // Add tools to the map
      extractedTools.forEach((tool) => {
        tools.push({
          ...tool,
          name: `${apiGroup.name}-${tool.name}`,
          tags: tool.tags.map((tag) => kebabCase(`${apiGroup.name}-${tag}`)),
          securityScheme: {
            baseUrlEnvVar: getEnvVarName(apiGroup.name, "BASE_URL"),
            schemas: allSecuritySchemes,
          },
        });
      });
    }
  }

  return tools;
}
