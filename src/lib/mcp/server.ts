import * as fs from "fs/promises";
import * as path from "path";
import log from "electron-log";
import axios, { AxiosRequestConfig } from "axios";
import { McpToolDefinition } from "./types";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
  CallToolResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { mapOptimizedToOriginal } from "./mapper";

/**
 * Load tools from JSON files in the tools directory
 */
export async function loadToolsFromDirectory(
  toolsDir: string,
): Promise<Map<string, McpToolDefinition>> {
  const tools = new Map<string, McpToolDefinition>();

  try {
    const files = await fs.readdir(toolsDir);

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const filePath = path.join(toolsDir, file);
          const fileContent = await fs.readFile(filePath, "utf-8");
          const toolDefinition = JSON.parse(fileContent) as McpToolDefinition;

          if (toolDefinition.optimised) {
            tools.set(toolDefinition.optimised.name, toolDefinition);
          } else if (toolDefinition.name) {
            tools.set(toolDefinition.name, toolDefinition);
          }
        } catch (error) {
          log.error(`Error loading tool from file ${file}:`, error);
        }
      }
    }
  } catch (error) {
    log.error("Error loading tools:", error);
  }

  return tools;
}

/**
 * Execute an API tool with the provided arguments
 */
export async function executeApiTool(
  toolName: string,
  definition: McpToolDefinition,
  args: Record<string, unknown>,
  env: Record<string, string>,
): Promise<{ content: [{ type: "text"; text: string }] }> {
  try {
    const baseUrl = env[definition.securityScheme.baseUrlEnvVar];
    if (!baseUrl) {
      throw new Error(
        `Base URL environment variable ${definition.securityScheme.baseUrlEnvVar} is not set`,
      );
    }

    // Build URL with path parameters
    let url = baseUrl + definition.pathTemplate;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = { Accept: "application/json" };
    let requestBodyData: unknown = undefined;

    // Apply authentication from available security schemes
    const authSchemas = definition.securityScheme.schemas || [];
    let authApplied = false;

    for (const authSchema of authSchemas) {
      if (authApplied) break; // Stop once we've successfully applied auth

      switch (authSchema.type) {
        case "apiKey": {
          const apiKeyValue = env[authSchema.keyEnvVar];
          if (apiKeyValue) {
            if (authSchema.in === "header") {
              headers[authSchema.name.toLowerCase()] = apiKeyValue;
              authApplied = true;
            } else if (authSchema.in === "query") {
              queryParams[authSchema.name] = apiKeyValue;
              authApplied = true;
            }
          }
          break;
        }
        case "bearerToken": {
          const tokenValue = env[authSchema.tokenEnvVar];
          if (tokenValue) {
            headers["authorization"] = `Bearer ${tokenValue}`;
            authApplied = true;
          }
          break;
        }
        default:
          break;
      }
    }

    if (definition.originalToOptimisedMapping) {
      args = mapOptimizedToOriginal(
        args,
        definition.originalToOptimisedMapping,
      );
    }

    // Process parameters
    for (const param of definition.executionParameters) {
      const value = args[param.name];
      if (value !== undefined) {
        if (param.in === "path") {
          url = url.replace(
            `{${param.name}}`,
            encodeURIComponent(String(value)),
          );
        } else if (param.in === "query") {
          queryParams[param.name] = String(value);
        } else if (param.in === "header") {
          headers[param.name.toLowerCase()] = String(value);
        }
      }
    }

    // Ensure all path parameters are resolved
    if (url.includes("{")) {
      throw new Error(`Failed to resolve path parameters: ${url}`);
    }

    const finalUrl = url;

    // Handle request body if needed
    if (
      definition.requestBodyContentType &&
      typeof args["requestBody"] !== "undefined"
    ) {
      requestBodyData = args["requestBody"];
      headers["content-type"] = definition.requestBodyContentType;
    }

    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase() as
        | "GET"
        | "POST"
        | "PUT"
        | "DELETE"
        | "PATCH",
      url: finalUrl,
      params: queryParams,
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    log.info(`Executing tool "${toolName}": ${config.method} ${config.url}`);

    // Make the request
    const response = await axios(config);

    // Process and format the response
    let responseText = "";
    const contentType = response.headers["content-type"]?.toLowerCase() || "";

    // Handle JSON responses
    if (
      contentType.includes("application/json") &&
      typeof response.data === "object" &&
      response.data !== null
    ) {
      try {
        responseText = JSON.stringify(response.data, null, 2);
      } catch {
        responseText = "[Stringify Error]";
      }
    }
    // Handle string responses
    else if (typeof response.data === "string") {
      responseText = response.data;
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) {
      responseText = String(response.data);
    }
    // Handle empty responses
    else {
      responseText = `(Status: ${response.status} - No body content)`;
    }

    // Return formatted response
    return {
      content: [
        {
          type: "text",
          text: `API Response (Status: ${response.status}):\n${responseText}`,
        },
      ],
    };
  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;

    // Format Axios errors specially
    if (axios.isAxiosError(error)) {
      errorMessage = `API Error: ${error.response?.status} ${error.response?.statusText}\n${JSON.stringify(error.response?.data, null, 2)}`;
    }
    // Handle standard errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Handle unexpected error types
    else {
      errorMessage = "Unexpected error: " + String(error);
    }

    log.error(`Error during execution of tool '${toolName}':`, errorMessage);

    // Return error message to client
    return { content: [{ type: "text", text: errorMessage }] };
  }
}

/**
 * Create MCP server using the MCP SDK Server class with Express on top
 */
export function createMcpServer(
  serverName: string,
  tools: Map<string, McpToolDefinition>,
  env: Record<string, string>,
): Server {
  const SERVER_VERSION = "1.0.0";

  // Create the MCP SDK server
  const server = new Server(
    { name: serverName, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  // Set up MCP request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const toolsForClient: Tool[] = Array.from(tools.values()).map((def) => {
      // Use optimised version if available, otherwise fall back to original
      if (def.optimised) {
        return {
          name: def.optimised.name,
          description: def.optimised.description,
          inputSchema: def.optimised.inputSchema as Tool["inputSchema"],
        };
      }

      return {
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema as Tool["inputSchema"], // Cast to MCP Tool inputSchema type
      };
    });
    return { tools: toolsForClient };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest): Promise<CallToolResult> => {
      const { name: toolName, arguments: toolArgs } = request.params;
      const toolDefinition = tools.get(toolName);
      if (!toolDefinition) {
        log.error(`Error: Unknown tool requested: ${toolName}`);
        return {
          content: [
            {
              type: "text",
              text: `Error: Unknown tool requested: ${toolName}`,
            },
          ],
        };
      }
      return await executeApiTool(
        toolName,
        toolDefinition,
        toolArgs ?? {},
        env,
      );
    },
  );

  return server;
}
