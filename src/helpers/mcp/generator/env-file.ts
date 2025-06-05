/**
 * Generator for .env file and .env.example file
 */
import { McpApiGroup } from "@/helpers/db/mcp-db";
import { extractSecuritySchemes, getEnvVarName } from "./utils/security";
import { getApiById } from "@/helpers/db/api-db";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";

export async function generateEnvExample(
  apiGroups: Record<string, McpApiGroup>,
): Promise<string> {
  const baseUrls = Object.values(apiGroups)
    .map(
      (apiGroup) =>
        `${getEnvVarName(apiGroup.name, "BASE_URL")}=${apiGroup.serverUrl}`,
    )
    .join("\n");

  // Extract all security schemes from all API groups
  const allEnvVars = new Set<string>();
  const inferredEnvVars = new Set<string>();

  for (const [apiId, apiGroup] of Object.entries(apiGroups)) {
    if (apiGroup.endpoints && apiGroup.endpoints.length > 0) {
      const api = await getApiById(apiId);
      if (api) {
        try {
          const apiSpec = (await SwaggerParser.dereference(
            api.originalFilePath,
          )) as OpenAPIV3.Document;

          const securitySchemes = extractSecuritySchemes(
            apiSpec,
            apiGroup.name,
          );

          // Add environment variables for all security schemes
          securitySchemes.forEach((scheme) => {
            if (scheme.type === "apiKey") {
              const envVar = `${scheme.keyEnvVar}=`;
              allEnvVars.add(envVar);
              if (scheme.isInferred) {
                inferredEnvVars.add(envVar);
              }
            } else if (scheme.type === "bearerToken") {
              const envVar = `${scheme.tokenEnvVar}=`;
              allEnvVars.add(envVar);
              if (scheme.isInferred) {
                inferredEnvVars.add(envVar);
              }
            }
          });
        } catch (error) {
          console.warn(
            `Failed to process security schemes for API ${apiId}:`,
            error,
          );
        }
      }
    }
  }

  const sortedEnvVars = Array.from(allEnvVars).sort();
  let keys = "";

  if (inferredEnvVars.size > 0) {
    keys +=
      "# Authentication credentials (inferred - not defined in OpenAPI spec)\n";
    keys +=
      "# These are common authentication methods that may work with this API\n";
    sortedEnvVars.forEach((envVar) => {
      if (inferredEnvVars.has(envVar)) {
        keys += `${envVar}\n`;
      }
    });

    const nonInferredVars = sortedEnvVars.filter(
      (envVar) => !inferredEnvVars.has(envVar),
    );
    if (nonInferredVars.length > 0) {
      keys += "\n# Authentication credentials (defined in OpenAPI spec)\n";
      keys += nonInferredVars.join("\n");
    }
  } else {
    keys = sortedEnvVars.join("\n");
  }

  let content = `# MCP Server Environment Variables
# Copy this file to .env and fill in the values

# Server configuration
${baseUrls}

PORT=3000
LOG_LEVEL=info

`;

  // Add security scheme environment variables with examples
  if (keys.length > 0) {
    content += `# API Authentication\n`;

    content += keys;
  } else {
    content += `# No API authentication required\n`;
  }

  return content;
}

/**
 * Generates dotenv configuration code for the MCP server
 *
 * @returns Code for loading environment variables
 */
export function generateDotenvConfig(): string {
  return `
/**
 * Load environment variables from .env file
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (result.error) {
  console.warn('Warning: No .env file found or error loading .env file.');
  console.warn('Using default environment variables.');
}

export const config = {
  port: process.env.PORT || '3000',
  logLevel: process.env.LOG_LEVEL || 'info',
};
`;
}
