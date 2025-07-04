import { McpApiGroup } from "@/lib/db/mcp-db";
import { McpToolDefinition } from "../types";
import { getApiById } from "@/lib/db/api-db";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { buildVariableName, discoverAuthSchemes } from "./auth";
import { toHyphenCase } from "@/lib/string";

export async function buildMcpToolDefinitions(
  apiGroups: Record<string, McpApiGroup>,
) {
  const operations: McpToolDefinition[] = [];

  for (const [apiId, apiGroup] of Object.entries(apiGroups)) {
    // Extract operations if present
    if (apiGroup.tools && apiGroup.tools.length > 0) {
      const api = await getApiById(apiId);
      if (!api) {
        throw new Error(`Service with ID ${apiId} not found`);
      }
      // Dereference API spec for proper tool descriptions
      const apiSpecification = (await SwaggerParser.dereference(
        api.api,
      )) as OpenAPIV3.Document;

      // Discover authentication schemes
      const authenticationSchemes = discoverAuthSchemes(
        apiSpecification,
        apiGroup.name,
      );

      // Process operations
      apiGroup.tools?.forEach((operation) => {
        const prefix = apiGroup.toolPrefix;
        operations.push({
          ...operation,
          name: operation.name,
          prefix: prefix,
          tags: operation.tags.map((category) =>
            toHyphenCase(`${prefix}-${category}`),
          ),
          securityScheme: {
            baseUrlEnvVar: buildVariableName(apiGroup.name, "BASE_URL"),
            schemas: authenticationSchemes,
          },
        });
      });
    }
  }

  return operations;
}

function buildToolTypesCode(): string {
  return `type JsonObject = Record<string, any>;

export type AuthSchema =
  | {
      type: "apiKey";
      keyEnvVar: string;
      in: "header" | "query";
      name: string;
      isInferred?: boolean;
    }
  | {
      type: "bearerToken";
      tokenEnvVar: string;
      isInferred?: boolean;
    };

export type AuthSchemas = Array<AuthSchema>;

/**
 * MCP Tool Definition describes a tool extracted from an OpenAPI spec
 * for use in Model Context Protocol server
 */
export interface McpToolDefinition {
  /** Optimised tool definition */
  optimised?: {
    name: string;
    description: string;
    inputSchema: any;
  };
  /** Token count of the optimised tool definition */
  optimisedTokenCount?: number;
  /** Mapping of the original tool definition to the optimised tool definition */
  originalToOptimisedMapping?: MappingConfig;
  /** Token count of the original tool definition */
  originalTokenCount: number;
  /** API ID of the tool */
  apiId: string;
  /** Prefix of the tool */
  prefix?: string;
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
  /** Parameter names and locations for execution */
  executionParameters: { name: string; in: string }[];
  /** Content type for request body, if applicable */
  requestBodyContentType?: string;
  /** Original operation ID from the OpenAPI spec */
  securityScheme: {
    baseUrlEnvVar: string;
    schemas: AuthSchemas;
  };
}`;
}

function buildToolLoaderCode(): string {
  return `
// Permission to HTTP method mapping
const permissionMethodMap = {
  create: ['post'],
  read: ['get'],
  update: ['put', 'patch'],
  delete: ['delete'],
};

export function loadTools(toolPermissions: { [key: string]: string } = {}) {
  // Discover tool configurations from JSON files
  const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));

  const toolCollection = new Map<string, McpToolDefinition>();
  
  try {
    // Verify tools directory exists
    if (fs.existsSync(toolsDirectory)) {
      // Read directory contents
      const fileList = fs.readdirSync(toolsDirectory);
      
      // Process JSON files
      for (const fileName of fileList) {
        if (fileName.endsWith('.json')) {
          try {
            const filePath = path.join(toolsDirectory, fileName);
            const fileData = fs.readFileSync(filePath, 'utf-8');
            const toolConfig = JSON.parse(fileData) as McpToolDefinition;
            
            const prefix = toolConfig.prefix || "";

            if (toolConfig.optimised) {
              toolCollection.set(prefix + toolConfig.optimised.name, toolConfig);
            } else if (toolConfig.name) {
              toolCollection.set(prefix + toolConfig.name, toolConfig);
            }

          } catch (err) {
            console.error("Failed loading tool from " + fileName + ":", err);
          }
        }
      }
    }
  } catch (err) {
    console.error('Tool discovery error:', err);
  }
  
  // Return all tools if no permission specified
  if (Object.keys(toolPermissions).length === 0) {
    return toolCollection;
  }

  // Filter based on selections
  const filteredCollection = new Map<string, McpToolDefinition>();

  for (const [name, toolConfig] of toolCollection) {
    // Verify method permission
    const methodAllowed = toolConfig.tags.length > 0 && toolConfig.tags.every(category => {
      const permission = toolPermissions[category];
      if (!permission) return false;
      
      if (permission === 'all') return true;
      
      const allowedMethods = permissionMethodMap[permission as keyof typeof permissionMethodMap];
      return allowedMethods && allowedMethods.includes(toolConfig.method.toLowerCase());
    });
    
    // Verify all tags are permitted
    const tagsAllowed = toolConfig.tags.length > 0 && 
                              toolConfig.tags.every(category => Boolean(toolPermissions[category]));
    
    // Include if both conditions met
    if (methodAllowed && tagsAllowed) {
      filteredCollection.set(name, toolConfig);
    }
  }

  return filteredCollection;
}
`;
}

function buildToolFormatterCode(): string {
  return `/**
 * Format API errors
 * 
 * @param err Axios error
 * @returns Formatted message
 */
function formatApiResponse(err: AxiosError): string {
    let msg = 'Request failed.';
    if (err.response) {
        msg = \`Status: \${err.response.status} (\${err.response.statusText || 'No status text'}). \`;
        const data = err.response.data;
        const LIMIT = 200;
        if (typeof data === 'string') { 
            msg += \`Response: \${data.substring(0, LIMIT)}\${data.length > LIMIT ? '...' : ''}\`; 
        }
        else if (data) { 
            try { 
                const json = JSON.stringify(data); 
                msg += \`Response: \${json.substring(0, LIMIT)}\${json.length > LIMIT ? '...' : ''}\`; 
            } catch { 
                msg += 'Response: [Unable to serialize]'; 
            } 
        }
        else { 
            msg += 'No response body.'; 
        }
    } else if (err.request) {
        msg = 'Network error: No response.';
        if (err.code) msg += \` (Code: \${err.code})\`;
    } else { 
        msg += \`Setup error: \${err.message}\`; 
    }
    return msg;
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
}`;
}

/**
 * Builds API executor function with authentication
 *
 * @returns Generated executor code
 */
function buildToolExecutorCode(): string {
  return `
export async function executeTool(
  toolName: string,
  definition: McpToolDefinition,
  extra: RequestHandlerExtra<CallToolRequest, ServerNotification>,
  args: Record<string, any>
): Promise<CallToolResult> {
  try {
    let baseUrl = process.env[definition.securityScheme.baseUrlEnvVar];
    if (!baseUrl) {
      throw new Error(
        \`Base URL environment variable \${definition.securityScheme.baseUrlEnvVar} is not set\`
      );
    }

    // Remove trailing slash from baseUrl to avoid double slashes when concatenating with pathTemplate
    baseUrl = baseUrl.replace(/\\/$/, '');

    // --- Argument Validation using Zod ---
    let validatedArgs: JsonObject;
    try {
      const schema = definition.optimised?.inputSchema || definition.inputSchema;
      const zodSchema = getZodSchemaFromJsonSchema(schema, toolName);
      const argsToParse = typeof args === 'object' && args !== null ? args : {};
      validatedArgs = zodSchema.parse(argsToParse);
      console.log(\`Arguments validated successfully for tool '\${toolName}'.\`);
    } catch (error: any) {
      if (error instanceof ZodError) {
        const validationErrorMessage = \`Invalid arguments for tool '\${toolName}': \${error.errors
          .map((e) => \`\${e.path.join('.')} (\${e.code}): \${e.message}\`)
          .join(', ')}\`;
        console.error(validationErrorMessage);
        return { content: [{ type: 'text', text: validationErrorMessage }] };
      } else {
        console.error(
          \`Unexpected error during argument validation setup for tool '\${toolName}':\`,
          error
        );
        return {
          content: [
            {
              type: 'text',
              text: \`Internal server error during argument validation setup for tool '\${toolName}'.\`,
            },
          ],
        };
      }
    }

    if (definition.originalToOptimisedMapping) {
      validatedArgs = mapOptimizedToOriginal(validatedArgs, definition.originalToOptimisedMapping);
    }

    // Build URL with path parameters
    let url = baseUrl + definition.pathTemplate;
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = { Accept: 'application/json' };
    let requestBodyData: unknown = undefined;

    // Apply authentication from available security schemes
    const authSchemas = definition.securityScheme.schemas || [];
    let authApplied = false;

    for (const authSchema of authSchemas) {
      if (authApplied) break; // Stop once we've successfully applied auth

      switch (authSchema.type) {
        case 'apiKey':
          let apiKeyValue: string | undefined;

          // First check if API key is provided in request headers
          if (authSchema.in === 'header' && extra.requestInfo?.headers) {
            // Check for the specific header name or common API key headers
            const headerName = authSchema.name.toLowerCase();
            const headerValue =
              extra.requestInfo.headers[headerName] || extra.requestInfo.headers['x-api-key'];
            // Handle string or string[] values
            apiKeyValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;
          }

          // Fall back to environment variable if not in headers
          if (!apiKeyValue) {
            apiKeyValue = process.env[authSchema.keyEnvVar];
          }

          if (apiKeyValue) {
            if (authSchema.in === 'header') {
              headers[authSchema.name.toLowerCase()] = apiKeyValue;
              authApplied = true;
            } else if (authSchema.in === 'query') {
              queryParams[authSchema.name] = apiKeyValue;
              authApplied = true;
            }
          }
          break;
        case 'bearerToken':
          let tokenValue: string | undefined;

          // First check if authorization header is provided in request headers
          if (extra.requestInfo?.headers) {
            const authHeader = extra.requestInfo.headers['authorization'];
            // Handle string or string[] values
            const authHeaderValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
            if (authHeaderValue?.toLowerCase().startsWith('bearer ')) {
              tokenValue = authHeaderValue.substring(7); // Remove 'Bearer ' prefix
            }
          }

          // Then check if token is provided in authInfo
          if (!tokenValue) {
            tokenValue = extra.authInfo?.token;
          }

          // Fall back to environment variable if not in headers or authInfo
          if (!tokenValue) {
            tokenValue = process.env[authSchema.tokenEnvVar];
          }

          if (tokenValue) {
            headers['authorization'] = \`Bearer \${tokenValue}\`;
            authApplied = true;
          }
          break;
        default:
          break;
      }
    }

    // Process parameters
    for (const param of definition.executionParameters) {
      const value = validatedArgs[param.name];
      if (value !== undefined) {
        if (param.in === 'path') {
          url = url.replace(\`{\${param.name}}\`, encodeURIComponent(String(value)));
        } else if (param.in === 'query') {
          queryParams[param.name] = String(value);
        } else if (param.in === 'header') {
          headers[param.name.toLowerCase()] = String(value);
        }
      }
    }

    // Ensure all path parameters are resolved
    if (url.includes('{')) {
      throw new Error(\`Failed to resolve path parameters: \${url}\`);
    }

    const finalUrl = url;

    // Handle request body if needed
    if (definition.requestBodyContentType && typeof validatedArgs['requestBody'] !== 'undefined') {
      requestBodyData = validatedArgs['requestBody'];
      headers['content-type'] = definition.requestBodyContentType;
    }

    const config: AxiosRequestConfig = {
      method: definition.method.toUpperCase(),
      url: finalUrl,
      params: queryParams,
      headers: headers,
      ...(requestBodyData !== undefined && { data: requestBodyData }),
    };

    // Log request info to stderr (doesn't affect MCP output)
    console.error(\`Executing tool "\${toolName}": \${config.method} \${config.url}\`);

    // Make the request
    const response = await axios(config);

    // Process and format the response
    let responseText = '';
    const contentType = response.headers['content-type']?.toLowerCase() || '';

    // Handle JSON responses
    if (
      contentType.includes('application/json') &&
      typeof response.data === 'object' &&
      response.data !== null
    ) {
      try {
        responseText = JSON.stringify(response.data, null, 2);
      } catch (e) {
        responseText = '[Stringify Error]';
      }
    }
    // Handle string responses
    else if (typeof response.data === 'string') {
      responseText = response.data;
    }
    // Handle other response types
    else if (response.data !== undefined && response.data !== null) {
      responseText = String(response.data);
    }
    // Handle empty responses
    else {
      responseText = \`(Status: \${response.status} - No body content)\`;
    }

    // Return formatted response
    return {
      content: [
        {
          type: 'text',
          text: \`API Response (Status: \${response.status}):\n\${responseText}\`,
        },
      ],
    };
  } catch (error: unknown) {
    // Handle errors during execution
    let errorMessage: string;

    // Format Axios errors specially
    if (axios.isAxiosError(error)) {
      errorMessage = formatApiResponse(error);
    }
    // Handle standard errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Handle unexpected error types
    else {
      errorMessage = 'Unexpected error: ' + String(error);
    }

    // Log error to stderr
    console.error(\`Error during execution of tool '\${toolName}':\`, errorMessage);

    // Return error message to client
    return { content: [{ type: 'text', text: errorMessage }] };
  }
}`;
}

export function buildToolCode(): string {
  return `import { z, ZodError } from 'zod';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import axios, { type AxiosRequestConfig, type AxiosError } from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { MappingConfig, mapOptimizedToOriginal } from '../mapper.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolRequest, CallToolResult, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

${buildToolTypesCode()}

${buildToolFormatterCode()}

${buildToolLoaderCode()}

${buildToolExecutorCode()}
`;
}
