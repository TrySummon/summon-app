/**
 * Functions for extracting tools from an OpenAPI specification
 */
import type { JSONSchema7, JSONSchema7TypeName } from "json-schema";
import { OpenAPIV3 } from "openapi-types";

import { McpToolDefinitionWithoutAuth } from "../types/index";
import { generateOperationId, kebabCase } from "../generator/utils";
import { apiDb } from "@/lib/db/api-db";
import log from "electron-log/main";
import { calculateTokenCount } from "@/lib/tiktoken";

export interface SelectedEndpoint {
  path: string;
  method: string;
}

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
 * Handles allOf schema composition by merging all schemas into a single schema
 *
 * @param schemas Array of processed JSON schemas
 * @returns Merged JSON schema
 */
function handleAllOf(schemas: (JSONSchema7 | boolean)[]): JSONSchema7 {
  const mergedSchema: JSONSchema7 = {
    type: "object",
    properties: {},
    required: [],
  };

  for (const schema of schemas) {
    if (typeof schema === "boolean") {
      // Boolean schemas are not meaningful in allOf context for our use case
      continue;
    }

    // Merge type (prefer object if any schema is object)
    if (schema.type === "object" || !mergedSchema.type) {
      mergedSchema.type = schema.type || "object";
    }

    // Merge properties
    if (schema.properties) {
      mergedSchema.properties = {
        ...mergedSchema.properties,
        ...schema.properties,
      };
    }

    // Merge required arrays
    if (schema.required && Array.isArray(schema.required)) {
      const existingRequired = Array.isArray(mergedSchema.required)
        ? mergedSchema.required
        : [];
      mergedSchema.required = [
        ...new Set([...existingRequired, ...schema.required]),
      ];
    }

    // Merge other properties
    if (schema.description && !mergedSchema.description) {
      mergedSchema.description = schema.description;
    }

    if (schema.title && !mergedSchema.title) {
      mergedSchema.title = schema.title;
    }

    // Handle array items if the merged type becomes array
    if (schema.type === "array" && schema.items) {
      mergedSchema.type = "array";
      mergedSchema.items = schema.items;
      delete mergedSchema.properties;
      delete mergedSchema.required;
    }
  }

  // Clean up empty required array
  if (
    Array.isArray(mergedSchema.required) &&
    mergedSchema.required.length === 0
  ) {
    delete mergedSchema.required;
  }

  // Set additionalProperties to false for object types
  if (mergedSchema.type === "object") {
    mergedSchema.additionalProperties = false;
  }

  return mergedSchema;
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
    log.warn(`Unresolved $ref '${schema.$ref}'.`);
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

  // Handle allOf, oneOf, anyOf composition
  if (jsonSchema.allOf) {
    return handleAllOf(
      jsonSchema.allOf.map((s) =>
        mapOpenApiSchemaToJsonSchema(
          s as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
        ),
      ),
    );
  }

  if (jsonSchema.oneOf) {
    jsonSchema.oneOf = jsonSchema.oneOf.map((s) =>
      mapOpenApiSchemaToJsonSchema(
        s as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
      ),
    );
  }

  if (jsonSchema.anyOf) {
    jsonSchema.anyOf = jsonSchema.anyOf.map((s) =>
      mapOpenApiSchemaToJsonSchema(
        s as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
      ),
    );
  }

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
    const processedItems = mapOpenApiSchemaToJsonSchema(
      jsonSchema.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    );

    // Handle malformed array items - if we have an array of arrays without proper items definition
    if (
      typeof processedItems === "object" &&
      processedItems.type === "array" &&
      !processedItems.items
    ) {
      log.warn(
        `Found array with incomplete items schema. Attempting to infer correct type from example.`,
      );

      // Try to infer the correct type from the example
      if (schema.example && Array.isArray(schema.example)) {
        if (schema.example.length > 0) {
          const firstItem = schema.example[0];
          if (typeof firstItem === "string") {
            jsonSchema.items = { type: "string" };
          } else if (typeof firstItem === "number") {
            jsonSchema.items = { type: "number" };
          } else if (typeof firstItem === "boolean") {
            jsonSchema.items = { type: "boolean" };
          } else if (typeof firstItem === "object") {
            jsonSchema.items = { type: "object" };
          } else {
            // Default to string if we can't determine the type
            jsonSchema.items = { type: "string" };
          }
        } else {
          // Empty example array, default to string
          jsonSchema.items = { type: "string" };
        }
      } else {
        // No example available, default to string
        jsonSchema.items = { type: "string" };
      }
    } else {
      jsonSchema.items = processedItems;
    }
  }

  return jsonSchema;
}

interface SchemaMap {
  [schemaRef: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
}

/**
 * Type guard to check if an object has a $ref property
 */
function hasRef(obj: unknown): obj is { $ref: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "$ref" in obj &&
    typeof (obj as { $ref: unknown }).$ref === "string"
  );
}

/**
 * Resolve a JSON Reference to its actual schema definition
 */
function resolveReference(
  api: OpenAPIV3.Document,
  ref: string,
): OpenAPIV3.SchemaObject | null {
  if (!ref.startsWith("#/")) {
    throw new Error(`External references not supported: ${ref}`);
  }

  // Remove the '#/' prefix and split the path
  const path = ref.substring(2).split("/");

  // Navigate through the API spec to find the referenced schema
  let current: Record<string, unknown> = api as unknown as Record<
    string,
    unknown
  >;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      const next = current[segment];
      if (typeof next === "object" && next !== null) {
        current = next as Record<string, unknown>;
      } else {
        log.warn(`Could not resolve reference: ${ref}`);
        return null;
      }
    } else {
      log.warn(`Could not resolve reference: ${ref}`);
      return null;
    }
  }

  return current as OpenAPIV3.SchemaObject;
}

/**
 * Recursively collects all referenced schemas from an OpenAPI endpoint
 * Returns a flat map of schema references to their definitions
 */
export async function collectEndpointSchemas(
  apiId: string,
  httpMethod: string,
  endpointPath: string,
): Promise<SchemaMap> {
  const api = await apiDb.getApiById(apiId, false);
  if (!api) {
    throw new Error(`API not found for ID: ${apiId}`);
  }
  const spec = api.api;

  // Get the endpoint definition
  const endpoint =
    spec.paths?.[endpointPath]?.[
      httpMethod.toLowerCase() as OpenAPIV3.HttpMethods
    ];

  if (!endpoint) {
    throw new Error(`Endpoint ${httpMethod} ${endpointPath} not found`);
  }

  const schemaMap: SchemaMap = {};
  const visited = new Set<string>();

  /**
   * Recursively collect all $ref references from a schema object
   */
  function collectRefs(obj: unknown): void {
    if (!obj || typeof obj !== "object") return;

    // Handle $ref
    if (hasRef(obj)) {
      const ref = obj.$ref;

      // Skip if already processed
      if (visited.has(ref)) return;
      visited.add(ref);

      // Resolve the reference to get the actual schema
      const schema = resolveReference(spec, ref);
      if (schema) {
        schemaMap[ref] = schema;
        // Recursively collect refs from the resolved schema
        collectRefs(schema);
      }
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item) => collectRefs(item));
      return;
    }

    // Handle objects - recursively check all properties
    if (typeof obj === "object") {
      Object.values(obj).forEach((value) => collectRefs(value));
    }
  }

  // Start collection from the endpoint definition
  collectRefs(endpoint);

  return schemaMap;
}

/**
 * Extracts tool definition from an endpoint
 *
 * @param apiId The ID of the API to extract tools from
 * @param endpoint Endpoint
 * @param options Options for extraction
 * @returns MCP tool definition
 */
export async function convertEndpointToTool(
  apiId: string,
  endpoint: SelectedEndpoint,
  options?: { ignoreDeprecated?: boolean; ignoreOptional?: boolean },
): Promise<McpToolDefinitionWithoutAuth> {
  const api = await apiDb.getApiById(apiId);
  if (!api) {
    throw new Error(`API not found for ID: ${apiId}`);
  }
  const spec = api.api;

  const path = spec.paths[endpoint.path];
  const operation = path?.[
    endpoint.method.toLowerCase() as OpenAPIV3.HttpMethods
  ] as OpenAPIV3.OperationObject | undefined;
  if (!operation) {
    throw new Error(
      `Operation not found for endpoint ${endpoint.path} and method ${endpoint.method}`,
    );
  }
  operation.parameters = operation.parameters || [];
  if (path?.parameters) {
    operation.parameters.push(...path.parameters);
  }

  // Generate a unique name for the tool
  let name =
    operation.operationId ||
    generateOperationId(endpoint.method, endpoint.path);

  // Sanitize the name to be MCP-compatible (only a-z, 0-9, _, -)
  name = name
    .replace(/\./g, "_")
    .replace(/[^a-z0-9_-]/gi, "_")
    .toLowerCase();

  if (options?.ignoreDeprecated && operation.deprecated) {
    throw new Error(`Skipped ${name}: Deprecated`);
  }

  // Get or create a description
  const description =
    operation.description ||
    operation.summary ||
    `Executes ${endpoint.method.toUpperCase()} ${endpoint.path}`;

  // Generate input schema and extract parameters
  const { inputSchema, parameters, requestBodyContentType } =
    generateInputSchemaAndDetails(operation, options);

  // SIZE LIMIT 100KB - Check if the input schema exceeds the limit
  const schemaSize = JSON.stringify(inputSchema).length;
  const maxSizeBytes = 200 * 1024;

  if (schemaSize > maxSizeBytes) {
    throw new Error(
      `Skipped ${name}: Tool schema too large: ${Math.round((schemaSize / 1024) * 200) / 100}KB exceeds the 200KB limit. `,
    );
  }

  // Extract parameter details for execution
  const executionParameters = parameters.map((p) => ({
    name: p.name,
    in: p.in,
  }));

  return {
    apiId,
    name,
    description,
    tags: operation.tags?.map((tag: string) => kebabCase(tag)) || [],
    inputSchema,
    method: endpoint.method,
    pathTemplate: endpoint.path,
    executionParameters,
    requestBodyContentType,
    originalTokenCount: calculateTokenCount(
      JSON.stringify({ name, description, inputSchema }),
    ),
  };
}
