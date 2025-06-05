/**
 * Functions for extracting tools from an OpenAPI specification
 */
import type { JSONSchema7, JSONSchema7TypeName } from "json-schema";
import { OpenAPIV3 } from "openapi-types";

import { McpToolDefinition } from "../types/index";
import { McpEndpoint } from "@/lib/db/mcp-db";
import { generateOperationId, kebabCase } from "../generator/utils";

/**
 * Generates input schema and extracts parameter details from an operation
 *
 * @param operation OpenAPI operation object
 * @returns Input schema, parameters, and request body content type
 */
function generateInputSchemaAndDetails(
  operation: OpenAPIV3.OperationObject,
  options?: { ignoreOptional?: boolean },
): {
  inputSchema: JSONSchema7 | boolean;
  parameters: OpenAPIV3.ParameterObject[];
  requestBodyContentType?: string;
} {
  const properties: { [key: string]: JSONSchema7 | boolean } = {};
  const required: string[] = [];

  // Process parameters
  const allParameters: OpenAPIV3.ParameterObject[] = Array.isArray(
    operation.parameters,
  )
    ? operation.parameters.map((p) => p as OpenAPIV3.ParameterObject)
    : [];

  allParameters.forEach((param) => {
    if (!param.name || !param.schema) return;
    if (options?.ignoreOptional && !param.required) return;

    const paramSchema = mapOpenApiSchemaToJsonSchema(
      param.schema as OpenAPIV3.SchemaObject,
    );
    if (typeof paramSchema === "object") {
      paramSchema.description = param.description || paramSchema.description;
    }

    properties[param.name] = paramSchema;
    if (param.required) required.push(param.name);
  });

  // Process request body (if present)
  let requestBodyContentType: string | undefined = undefined;

  if (operation.requestBody) {
    const opRequestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
    const jsonContent = opRequestBody.content?.["application/json"];
    const firstContent = opRequestBody.content
      ? Object.entries(opRequestBody.content)[0]
      : undefined;

    if (jsonContent?.schema) {
      requestBodyContentType = "application/json";
      const bodySchema = mapOpenApiSchemaToJsonSchema(
        jsonContent.schema as OpenAPIV3.SchemaObject,
      );

      if (typeof bodySchema === "object") {
        bodySchema.description =
          opRequestBody.description ||
          bodySchema.description ||
          "The JSON request body.";
      }

      properties["requestBody"] = bodySchema;
      required.push("requestBody");
    } else if (firstContent) {
      const [contentType] = firstContent;
      requestBodyContentType = contentType;

      properties["requestBody"] = {
        type: "string",
        description:
          opRequestBody.description ||
          `Request body (content type: ${contentType})`,
      };

      required.push("requestBody");
    }
  }

  // Combine everything into a JSON Schema
  const inputSchema: JSONSchema7 = {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
  };

  return { inputSchema, parameters: allParameters, requestBodyContentType };
}

/**
 * Maps an OpenAPI schema to a JSON Schema
 *
 * @param schema OpenAPI schema object or reference
 * @returns JSON Schema representation
 */
function mapOpenApiSchemaToJsonSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
): JSONSchema7 | boolean {
  // Handle reference objects
  if ("$ref" in schema) {
    console.warn(`Unresolved $ref '${schema.$ref}'.`);
    return { type: "object" };
  }

  // Handle boolean schemas
  if (typeof schema === "boolean") return schema;

  // Create a copy of the schema to modify
  const cleanSchema = { ...schema };

  // Remove OpenAPI-specific properties that aren't in JSON Schema
  delete cleanSchema.nullable;
  delete cleanSchema.example;
  delete cleanSchema.xml;
  delete cleanSchema.externalDocs;
  delete cleanSchema.deprecated;
  delete cleanSchema.readOnly;
  delete cleanSchema.writeOnly;

  const jsonSchema = cleanSchema as JSONSchema7;

  // Convert integer type to number (JSON Schema compatible)
  if (schema.type === "integer") jsonSchema.type = "number";

  // Handle nullable properties by adding null to the type
  if (schema.nullable) {
    if (Array.isArray(jsonSchema.type)) {
      if (!jsonSchema.type.includes("null")) jsonSchema.type.push("null");
    } else if (typeof jsonSchema.type === "string") {
      jsonSchema.type = [jsonSchema.type as JSONSchema7TypeName, "null"];
    } else if (!jsonSchema.type) {
      jsonSchema.type = "null";
    }
  }

  // Recursively process object properties
  if (jsonSchema.type === "object" && jsonSchema.properties) {
    const mappedProps: { [key: string]: JSONSchema7 | boolean } = {};

    for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
      if (typeof propSchema === "object" && propSchema !== null) {
        mappedProps[key] = mapOpenApiSchemaToJsonSchema(
          propSchema as unknown as OpenAPIV3.SchemaObject,
        );
      } else if (typeof propSchema === "boolean") {
        mappedProps[key] = propSchema;
      }
    }
    jsonSchema.additionalProperties = false;
    jsonSchema.properties = mappedProps;
  }

  // Recursively process array items
  if (
    jsonSchema.type === "array" &&
    typeof jsonSchema.items === "object" &&
    jsonSchema.items !== null
  ) {
    jsonSchema.items = mapOpenApiSchemaToJsonSchema(
      jsonSchema.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    );
  }

  return jsonSchema;
}

interface DereferencedMcpEndpoint extends McpEndpoint {
  operation: OpenAPIV3.OperationObject;
}

/**
 * Extracts tool definitions from an array of endpoints
 *
 * @param endpoints Array of endpoints
 * @param options Options for extraction
 * @returns Array of MCP tool definitions
 */
export function convertEndpointsToTools(
  endpoints: DereferencedMcpEndpoint[],
  options?: { ignoreDeprecated?: boolean; ignoreOptional?: boolean },
) {
  const tools: Omit<McpToolDefinition, "securityScheme">[] = [];
  const usedNames = new Set<string>();

  for (const endpoint of endpoints) {
    if (!endpoint.operation) continue;
    const operation = endpoint.operation;
    if (options?.ignoreDeprecated && operation.deprecated) continue;

    // Generate a unique name for the tool
    let baseName =
      operation.operationId ||
      generateOperationId(endpoint.method, endpoint.path);
    if (!baseName) continue;

    // Sanitize the name to be MCP-compatible (only a-z, 0-9, _, -)
    baseName = baseName
      .replace(/\./g, "_")
      .replace(/[^a-z0-9_-]/gi, "_")
      .toLowerCase();

    let finalToolName = baseName;
    let counter = 1;
    while (usedNames.has(finalToolName)) {
      finalToolName = `${baseName}_${counter++}`;
    }
    usedNames.add(finalToolName);

    // Get or create a description
    const description =
      operation.description ||
      operation.summary ||
      `Executes ${endpoint.method.toUpperCase()} ${endpoint.path}`;

    // Generate input schema and extract parameters
    const { inputSchema, parameters, requestBodyContentType } =
      generateInputSchemaAndDetails(operation, options);

    // Extract parameter details for execution
    const executionParameters = parameters.map((p) => ({
      name: p.name,
      in: p.in,
    }));

    // Create the tool definition
    tools.push({
      name: finalToolName,
      description,
      tags: operation.tags?.map((tag: string) => kebabCase(tag)) || [],
      inputSchema,
      method: endpoint.method,
      pathTemplate: endpoint.path,
      parameters,
      executionParameters,
      requestBodyContentType,
      operationId: baseName,
    });
  }

  return tools;
}
