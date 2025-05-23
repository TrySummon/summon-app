import { McpApiGroup } from "@/helpers/db/mcp-db";
import { McpToolDefinition } from "../types";
import { extractToolsFromApi } from "../parser/extract-tools";
import { apiKeyEnvVarName, baseUrlEnvVarName, bearerTokenEnvVarName, kebabCase } from "./utils";

export function generateMcpTools(apiGroups: Record<string, McpApiGroup>) {
      const tools: McpToolDefinition[] = [];
      
      // Process each API group
      Object.values(apiGroups).forEach((apiGroup) => {
          // Process endpoints if they exist
          if (apiGroup.endpoints && apiGroup.endpoints.length > 0) {
              // Use extractToolsFromApi to process the endpoints directly
              const extractedTools = extractToolsFromApi(apiGroup.endpoints);
              
              // Add tools to the map
              extractedTools.forEach(tool => {
                  tools.push({
                    ...tool,
                    name: `${apiGroup.name}-${tool.name}`,
                    tags: tool.tags.map((tag) => kebabCase(`${apiGroup.name}-${tag}`)),
                    securityScheme: {
                      baseUrlEnvVar: baseUrlEnvVarName(apiGroup.name),
                      schema: apiGroup.auth.type === "apiKey" ? {
                        type: "apiKey",
                        keyEnvVar: apiKeyEnvVarName(apiGroup.name),
                        in: apiGroup.auth.in,
                        name: apiGroup.auth.name
                      } : apiGroup.auth.type === "bearerToken" ? {
                        type: "bearerToken",
                        tokenEnvVar: bearerTokenEnvVarName(apiGroup.name)
                      } : undefined
                    }
                  });
              });
          }
      });

      return tools;
}