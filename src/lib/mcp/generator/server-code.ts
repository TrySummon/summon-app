import {
  generateCallToolHandler,
  generateListToolsHandler,
  generateLoadToolsFunction,
  generateParseToolArgsFunction,
} from "./utils/code-gen";
import { generateExecuteApiToolFunction } from "./utils/security";

export async function generateMcpServerCode(
  serverName: string,
  serverVersion: string,
  tags: string[],
  transport = "streamable-http",
  port = 3000,
): Promise<string> {
  // Generate code for tool arguments parsing
  const parseToolArgsFunctionCode = generateParseToolArgsFunction(tags);
  const loadToolsFunctionCode = generateLoadToolsFunction();

  // Generate code for API tool execution
  const executeApiToolFunctionCode = generateExecuteApiToolFunction();

  // Generate code for request handlers
  const callToolHandlerCode = generateCallToolHandler();
  const listToolsHandlerCode = generateListToolsHandler();

  // Determine which transport to include
  let transportImport = "";
  let transportCode = "";

  switch (transport) {
    case "web":
      transportImport = `\nimport { setupWebServer } from "./web-server.js";`;
      transportCode = `// Set up Web Server transport
  try {
    await setupWebServer(server, port);
  } catch (error) {
    console.error("Error setting up web server:", error);
    process.exit(1);
  }`;
      break;
    case "streamable-http":
      transportImport = `\nimport { setupStreamableHttpServer } from "./streamable-http.js";`;
      transportCode = `// Set up StreamableHTTP transport
  try {
    await setupStreamableHttpServer(server, port);
  } catch (error) {
    console.error("Error setting up StreamableHTTP server:", error);
    process.exit(1);
  }`;
      break;
    default: // stdio
      transportImport = "";
      transportCode = `// Set up stdio transport
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(\`\${SERVER_NAME} MCP Server (v\${SERVER_VERSION}) running on stdio\`);
  } catch (error) {
    console.error("Error during server startup:", error);
    process.exit(1);
  }`;
      break;
  }

  // Generate the full server code
  return `#!/usr/bin/env node
/**
 * MCP Server generated from OpenAPI spec for ${serverName} v${serverVersion}
 * Generated on: ${new Date().toISOString()}
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
  type CallToolRequest
} from "@modelcontextprotocol/sdk/types.js";${transportImport}

import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Type definition for JSON objects
 */
type JsonObject = Record<string, any>;

/**
 * Interface for MCP Tool Definition
 */
export interface McpToolDefinition {
  /** Name of the tool, must be unique */
  name: string;
  /** Human-readable description of the tool */
  description: string;
  /** JSON Schema that defines the input parameters */
  inputSchema: any;
  /** HTTP method for the operation (get, post, etc.) */
  method: string;
  /** Tags associated with the operation */
  tags: string[];
  /** URL path template with parameter placeholders */
  pathTemplate: string;
  /** OpenAPI parameter objects for this operation */
  parameters: any;
  /** Parameter names and locations for execution */
  executionParameters: { name: string; in: string }[];
  /** Content type for request body, if applicable */
  requestBodyContentType?: string;
  /** Original operation ID from the OpenAPI spec */
  operationId: string;
  securityScheme: {
    baseUrlEnvVar: string;
    schemas: Array<{
      type: "apiKey";
      keyEnvVar: string;
      in: "header" | "query";
      name: string;
      isInferred?: boolean;
    } | {
      type: "bearerToken";
      tokenEnvVar: string;
      isInferred?: boolean;
    }>;
  };
}

/**
 * Server configuration
 */
export const SERVER_NAME = "${serverName}";
export const SERVER_VERSION = "${serverVersion}";


/**
 * Parse command line arguments
 */
${parseToolArgsFunctionCode}
const toolOptions = parseToolArgs(process.argv.slice(2));

/**
 * MCP Server instance
 */
const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
);
const port = Number(process.env.PORT) || ${port};

${loadToolsFunctionCode}

/**
 * Map of tool definitions by name
 */
const tools = loadTools(toolOptions);

${listToolsHandlerCode}
${callToolHandlerCode}
${executeApiToolFunctionCode}

/**
 * Main function to start the server
 */
async function main() {
${transportCode}
}

/**
 * Cleanup function for graceful shutdown
 */
async function cleanup() {
    console.error("Shutting down MCP server...");
    process.exit(0);
}

// Register signal handlers
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the server
main().catch((error) => {
  console.error("Fatal error in main execution:", error);
  process.exit(1);
});

/**
 * Formats API errors for better readability
 * 
 * @param error Axios error
 * @returns Formatted error message
 */
function formatApiError(error: AxiosError): string {
    let message = 'API request failed.';
    if (error.response) {
        message = \`API Error: Status \${error.response.status} (\${error.response.statusText || 'Status text not available'}). \`;
        const responseData = error.response.data;
        const MAX_LEN = 200;
        if (typeof responseData === 'string') { 
            message += \`Response: \${responseData.substring(0, MAX_LEN)}\${responseData.length > MAX_LEN ? '...' : ''}\`; 
        }
        else if (responseData) { 
            try { 
                const jsonString = JSON.stringify(responseData); 
                message += \`Response: \${jsonString.substring(0, MAX_LEN)}\${jsonString.length > MAX_LEN ? '...' : ''}\`; 
            } catch { 
                message += 'Response: [Could not serialize data]'; 
            } 
        }
        else { 
            message += 'No response body received.'; 
        }
    } else if (error.request) {
        message = 'API Network Error: No response received from server.';
        if (error.code) message += \` (Code: \${error.code})\`;
    } else { 
        message += \`API Request Setup Error: \${error.message}\`; 
    }
    return message;
}

/**
 * Converts a JSON Schema to a Zod schema for runtime validation
 * 
 * @param jsonSchema JSON Schema
 * @param toolName Tool name for error reporting
 * @returns Zod schema
 */
function getZodSchemaFromJsonSchema(jsonSchema: any, toolName: string): z.ZodTypeAny {
    if (typeof jsonSchema !== 'object' || jsonSchema === null) { 
        return z.object({}).passthrough(); 
    }
    try {
        const zodSchemaString = jsonSchemaToZod(jsonSchema);
        const zodSchema = eval(zodSchemaString);
        if (typeof zodSchema?.parse !== 'function') { 
            throw new Error('Eval did not produce a valid Zod schema.'); 
        }
        return zodSchema as z.ZodTypeAny;
    } catch (err: any) {
        console.error(\`Failed to generate/evaluate Zod schema for '\${toolName}':\`, err);
        return z.object({}).passthrough();
    }
}
`;
}
