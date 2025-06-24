import { McpApiGroup } from "@/lib/db/mcp-db";
import { McpToolDefinition } from "../types";
import { kebabCase } from "./utils";
import { extractSecuritySchemes, getEnvVarName } from "./utils/security";
import { getApiById } from "@/lib/db/api-db";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";

export async function generateMcpTools(apiGroups: Record<string, McpApiGroup>) {
  const tools: McpToolDefinition[] = [];

  for (const [apiId, apiGroup] of Object.entries(apiGroups)) {
    // Process endpoints if they exist
    if (apiGroup.tools && apiGroup.tools.length > 0) {
      const api = await getApiById(apiId);
      if (!api) {
        throw new Error(`API with ID ${apiId} not found`);
      }
      // The MCP generator needs a dereferenced API spec, else the tool description will be wrong
      const apiSpec = (await SwaggerParser.dereference(
        api.api,
      )) as OpenAPIV3.Document;

      // Extract all security schemes from the OpenAPI spec
      const allSecuritySchemes = extractSecuritySchemes(apiSpec, apiGroup.name);

      // Add tools to the map
      apiGroup.tools?.forEach((tool) => {
        const prefix = apiGroup.toolPrefix || "";
        tools.push({
          ...tool,
          name: `${prefix}${tool.name}`,
          tags: tool.tags.map((tag) => kebabCase(`${prefix}-${tag}`)),
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
