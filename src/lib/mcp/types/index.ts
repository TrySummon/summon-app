/**
 * Core type definitions for the openapi-to-mcp generator
 */
import type { JSONSchema7 } from "json-schema";
import { MappingConfig } from "../mapper";

/**
 * Transport types supported by the MCP server
 */
export type TransportType = "stdio" | "web" | "streamable-http";

/**
 * MCP Tool Definition describes a tool extracted from an OpenAPI spec
 * for use in Model Context Protocol server
 */
export interface McpToolDefinition {
  /** Optimised tool definition */
  optimised?: {
    name: string;
    description: string;
    inputSchema: JSONSchema7 | boolean;
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
  inputSchema: JSONSchema7 | boolean;
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
    schemas: Array<
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
        }
    >;
  };
}

export type McpToolDefinitionWithoutAuth = Omit<
  McpToolDefinition,
  "securityScheme"
>;

/**
 * Helper type for JSON objects
 */
export type JsonObject = Record<string, unknown>;
