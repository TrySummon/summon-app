/**
 * Generator for .env file and .env.example file
 */
import { OpenAPIV3 } from "openapi-types";

import { getEnvVarName } from "../utils/security";
import { McpApiGroup } from "@/helpers/db/mcp-db";
import { apiKeyEnvVarName, baseUrlEnvVarName, bearerTokenEnvVarName } from "../utils";

/**
 * Generates the content of .env.example file for the MCP server
 *
 * @param securitySchemes Security schemes from the OpenAPI spec
 * @returns Content for .env.example file
 */
export function generateEnvExample(
  apiGroups: Record<string, McpApiGroup>
): string {
  const baseUrls = Object.values(apiGroups).map((apiGroup) => `${baseUrlEnvVarName(apiGroup.name)}=${apiGroup.serverUrl}`).join("\n");
  const keys = Object.values(apiGroups).map((apiGroup) => {
    switch (apiGroup.auth.type) {
      case "apiKey":
        return `${apiKeyEnvVarName(apiGroup.name)}=`;
      case "bearerToken":
        return `${bearerTokenEnvVarName(apiGroup.name)}=`;
      default:
        return "";
    }
  }).join("\n");
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
