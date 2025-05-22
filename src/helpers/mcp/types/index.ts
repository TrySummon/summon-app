/**
 * Core type definitions for the openapi-to-mcp generator
 */
import type { JSONSchema7 } from "json-schema";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Transport types supported by the MCP server
 */
export type TransportType = "stdio" | "web" | "streamable-http";


/**
 * MCP Tool Definition describes a tool extracted from an OpenAPI spec
 * for use in Model Context Protocol server
 */
export interface McpToolDefinition {
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
  /** OpenAPI parameter objects for this operation */
  parameters: OpenAPIV3.ParameterObject[];
  /** Parameter names and locations for execution */
  executionParameters: { name: string; in: string }[];
  /** Content type for request body, if applicable */
  requestBodyContentType?: string;
  /** Security requirements for this operation */
  securityRequirements: OpenAPIV3.SecurityRequirementObject[];
  /** Original operation ID from the OpenAPI spec */
  operationId: string;
  securityScheme: {
    baseUrlEnvVar: string;
    schema?: {
      type: "apiKey"
      keyEnvVar: string;
      in: "header" | "query";
      name: string;
    } | {
      type: "bearerToken"
      tokenEnvVar: string;
    }
  }
}

/**
 * Helper type for JSON objects
 */
export type JsonObject = Record<string, any>;
