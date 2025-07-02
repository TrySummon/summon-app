import express, { Request, Response, Application } from "express";
import cors from "cors";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { Server } from "http";
import log from "electron-log/main";
import { z } from "zod";
import { jsonSchemaToZod } from "json-schema-to-zod";

import { JSONSchema7 } from "json-schema";
import { generateFakeData } from "../mcp";

interface MockServerOptions {
  port: number;
}

interface RouteInfo {
  path: string;
  method: string;
  operation: OpenAPIV3.OperationObject;
  handler: (
    req: Request,
    res: Response,
    operation: OpenAPIV3.OperationObject,
  ) => void;
}

interface ServerInfo {
  host: string;
  port: number;
  url: string;
  pid: number;
  routes: string[];
}

interface MockResponse {
  status: number;
  mock: unknown;
}

export class OpenAPIMockServer {
  private port: number;
  private host: string;
  private app: Application;
  private server: Server | null = null;
  private spec: OpenAPIV3.Document | null = null;
  private routes: Map<string, RouteInfo> = new Map();
  private isRunning: boolean = false;

  constructor(options: MockServerOptions) {
    this.port = options.port;
    this.host = "localhost";
    this.app = express();

    // Setup express middleware
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  /**
   * Initialize the mock server with an OpenAPI specification
   */
  async initialize(spec: OpenAPIV3.Document | string): Promise<boolean> {
    try {
      // Parse, validate, and dereference the OpenAPI spec
      this.spec = (await SwaggerParser.dereference(spec)) as OpenAPIV3.Document;
      // Generate routes from spec
      this.generateRoutes();
      // Setup express routes
      this.setupRoutes();

      log.log("Mock server initialized successfully");
      return true;
    } catch (error) {
      log.error("Failed to initialize mock server:", error);
      throw error;
    }
  }

  /**
   * Generate routes from OpenAPI spec
   */
  private generateRoutes(): void {
    if (!this.spec?.paths) return;

    Object.entries(this.spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      const methods: (keyof OpenAPIV3.PathItemObject)[] = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "options",
      ] as (keyof OpenAPIV3.PathItemObject)[];

      methods.forEach((method) => {
        const operation = pathItem[method] as OpenAPIV3.OperationObject;
        if (operation) {
          const routeKey = `${method.toUpperCase()} ${path}`;

          this.routes.set(routeKey, {
            path,
            method: method.toUpperCase(),
            operation,
            handler: this.createDefaultHandler(operation),
          });
        }
      });
    });
  }

  /**
   * Setup express routes
   */
  private setupRoutes(): void {
    this.routes.forEach((route) => {
      try {
        const expressPath = this.convertOpenAPIPathToExpress(route.path);
        const method = route.method.toLowerCase() as keyof Application;

        if (typeof this.app[method] === "function") {
          try {
            this.app[method](expressPath, (req: Request, res: Response) => {
              try {
                // Basic request validation
                const validationError = this.validateRequest(
                  req,
                  route.operation,
                );
                if (validationError) {
                  return res.status(400).json({
                    error: "Validation failed",
                    details: validationError,
                  });
                }

                // Call the handler
                route.handler(req, res, route.operation);
              } catch (error) {
                log.error("Route handler error:", error);
                res.status(500).json({ error: "Internal server error" });
              }
            });
          } catch (pathError) {
            log.error(
              `Failed to register route due to path error: ${route.method} ${route.path} -> ${expressPath}`,
              pathError,
            );
            // Skip this route and continue with others
          }
        }
      } catch (error) {
        log.error(
          `Failed to setup route ${route.method} ${route.path}:`,
          error,
        );
        // Continue with other routes instead of crashing
      }
    });

    // Catch-all for unmatched routes - use a simpler pattern
    try {
      this.app.use((req: Request, res: Response) => {
        res.status(404).json({ error: "Not found" });
      });
    } catch (error) {
      log.error("Failed to setup catch-all route:", error);
    }
  }

  /**
   * Convert OpenAPI path to Express path
   */
  private convertOpenAPIPathToExpress(openApiPath: string): string {
    // Handle empty or invalid paths
    if (!openApiPath || typeof openApiPath !== "string") {
      log.warn("Invalid path:", openApiPath);
      return "/";
    }

    // Ensure path starts with /
    let path = openApiPath.startsWith("/") ? openApiPath : "/" + openApiPath;

    // Convert OpenAPI {param} to Express :param
    // Also handle edge cases like empty parameter names or malformed brackets
    path = path.replace(/{([^}]*)}/g, (match, paramName) => {
      const cleanParamName = paramName.trim();
      if (!cleanParamName) {
        log.warn("Empty parameter name in path:", openApiPath);
        return ":param";
      }
      // Ensure parameter names are valid Express parameter names
      const validParamName = cleanParamName.replace(/[^a-zA-Z0-9_]/g, "_");
      return ":" + validParamName;
    });

    // Handle any remaining unmatched opening or closing braces
    path = path.replace(/[{}]/g, "");

    // Handle multiple consecutive slashes
    path = path.replace(/\/+/g, "/");

    // Ensure path doesn't end with / unless it's the root path
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // Validate the final path doesn't contain invalid characters for Express
    if (path.includes("*") && path !== "/*") {
      log.warn("Path contains wildcard, sanitizing:", path);
      path = path.replace(/\*/g, "wildcard");
    }

    return path;
  }

  /**
   * Convert OpenAPI schema to Zod schema
   */
  private openApiSchemaToZod(schema: OpenAPIV3.SchemaObject): z.ZodSchema {
    try {
      // Convert OpenAPI schema to JSON Schema first, then to Zod
      const jsonSchema = this.openApiToJsonSchema(schema);
      const zodSchemaString = jsonSchemaToZod(jsonSchema);

      // Evaluate the generated Zod schema string
      const zodSchema = new Function("z", `return ${zodSchemaString}`)(z);
      return zodSchema;
    } catch (error) {
      log.warn("Failed to convert schema to Zod, using fallback:", error);
      // Fallback to a basic schema
      return z.any();
    }
  }

  /**
   * Convert OpenAPI schema to JSON Schema format
   */
  private openApiToJsonSchema(
    schema: OpenAPIV3.SchemaObject,
  ): Record<string, unknown> {
    // Convert OpenAPI 3.0 schema to JSON Schema Draft 7
    const jsonSchema: Record<string, unknown> = { ...schema };

    // Handle OpenAPI specific fields
    if (schema.nullable) {
      // For nullable types, use anyOf with null
      jsonSchema.anyOf = [{ type: schema.type }, { type: "null" }];
      delete jsonSchema.type;
      delete jsonSchema.nullable;
    }

    return jsonSchema;
  }

  /**
   * Validate request parameters - only check presence for path/query params
   */
  private validateRequest(
    req: Request,
    operation: OpenAPIV3.OperationObject,
  ): string | null {
    const parameters =
      (operation.parameters as OpenAPIV3.ParameterObject[]) || [];

    try {
      // Check required parameters
      for (const param of parameters) {
        if (!param.required) {
          continue; // Skip optional parameters
        }

        let value: unknown;
        switch (param.in) {
          case "path":
            value = req.params[param.name];
            break;
          case "query":
            value = req.query[param.name];
            break;
          case "header":
            value = req.headers[param.name.toLowerCase()];
            break;
          default:
            continue;
        }

        // Check if required parameter is missing
        if (value === undefined || value === null || value === "") {
          return `Required ${param.in} parameter '${param.name}' is missing`;
        }
      }

      return null;
    } catch (error) {
      log.error("Parameter validation error:", error);
      return "Parameter validation failed due to internal error";
    }
  }

  /**
   * Validate request body using Zod
   */
  private validateRequestBody(
    req: Request,
    operation: OpenAPIV3.OperationObject,
  ): string | null {
    const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;

    if (!requestBody) {
      return null; // No request body expected
    }

    // Check if request body is required
    if (
      requestBody.required &&
      (!req.body || Object.keys(req.body).length === 0)
    ) {
      return "Request body is required";
    }

    // Skip validation if no body provided and not required
    if (!req.body && !requestBody.required) {
      return null;
    }

    const content = requestBody.content || {};

    // Find the appropriate content type
    const contentType = req.get("content-type") || "application/json";
    const mediaTypeKey = this.findMatchingMediaType(content, contentType);

    if (!mediaTypeKey) {
      const supportedTypes = Object.keys(content);
      return `Unsupported content type '${contentType}'. Supported types: ${supportedTypes.join(", ")}`;
    }

    const mediaType = content[mediaTypeKey];
    if (!mediaType?.schema) {
      return null; // No schema to validate against
    }

    try {
      // Convert schema to Zod and validate
      const schema = mediaType.schema as OpenAPIV3.SchemaObject;
      const zodSchema = this.openApiSchemaToZod(schema);

      const result = zodSchema.safeParse(req.body);
      if (!result.success) {
        const error = result.error.errors[0];
        return `Request body validation failed: ${error.path.join(".")} - ${error.message}`;
      }

      return null;
    } catch (error) {
      log.error("Request body validation error:", error);
      return "Request body validation failed due to internal error";
    }
  }

  /**
   * Find matching media type from content object
   */
  private findMatchingMediaType(
    content: Record<string, OpenAPIV3.MediaTypeObject>,
    contentType: string,
  ): string | null {
    // Exact match first
    if (content[contentType]) {
      return contentType;
    }

    // Check for wildcard matches
    const baseType = contentType.split(";")[0].trim(); // Remove charset etc.
    if (content[baseType]) {
      return baseType;
    }

    // Check for application/json variants
    if (baseType.includes("json") && content["application/json"]) {
      return "application/json";
    }

    // Default to first available if no match
    return Object.keys(content)[0] || null;
  }

  /**
   * Create default handler for an operation
   */
  private createDefaultHandler(operation: OpenAPIV3.OperationObject) {
    return (req: Request, res: Response): void => {
      try {
        // Validate request parameters
        const validationError = this.validateRequest(req, operation);
        if (validationError) {
          res.status(400).json({
            error: "Parameter validation failed",
            message: validationError,
            operationId: operation.operationId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Request body validation
        const bodyValidationError = this.validateRequestBody(req, operation);
        if (bodyValidationError) {
          res.status(400).json({
            error: "Request body validation failed",
            message: bodyValidationError,
            operationId: operation.operationId,
            timestamp: new Date().toISOString(),
          });
          return;
        }

        // Generate and return mock response
        const { status, mock } = this.generateMockResponse(operation);
        res.status(status).json(mock);
      } catch (error) {
        log.error("Error in default handler:", error);
        res.status(500).json({
          error: "Internal server error",
          operationId: operation.operationId,
          timestamp: new Date().toISOString(),
        });
      }
    };
  }

  /**
   * Generate mock response based on OpenAPI operation
   */
  private generateMockResponse(
    operation: OpenAPIV3.OperationObject,
  ): MockResponse {
    const responses = operation.responses || {};

    // Find the first successful response (2xx)
    const successStatus =
      Object.keys(responses).find(
        (status) => status.startsWith("2") || status === "default",
      ) || "200";

    const response = responses[successStatus] as OpenAPIV3.ResponseObject;
    if (!response) {
      return {
        status: 200,
        mock: {
          message: "Mock response",
          operationId: operation.operationId,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const content = response.content || {};

    // Try to find JSON content first
    const jsonContent =
      content["application/json"] ||
      content["application/hal+json"] ||
      Object.values(content)[0];

    if (jsonContent?.schema) {
      return {
        status: parseInt(successStatus) || 200,
        mock: this.generateMockFromSchema(
          jsonContent.schema as OpenAPIV3.SchemaObject,
        ),
      };
    }

    // Fallback response
    return {
      status: parseInt(successStatus) || 200,
      mock: {
        message: "Mock response",
        operationId: operation.operationId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Generate mock data from JSON schema using JSON Schema Faker
   */
  private generateMockFromSchema(schema: OpenAPIV3.SchemaObject): unknown {
    if (!schema) return null;

    // Handle examples first - if provided, use them
    if (schema.example !== undefined) {
      return schema.example;
    }

    // Use JSON Schema Faker to generate realistic mock data synchronously
    const mockData = generateFakeData(schema as JSONSchema7);
    return mockData;
  }

  /**
   * Start the mock server
   */
  async start(): Promise<ServerInfo> {
    if (this.isRunning) {
      throw new Error("Server is already running");
    }

    if (!this.spec) {
      throw new Error("Server not initialized. Call initialize() first.");
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        this.isRunning = true;
        const serverInfo: ServerInfo = {
          host: this.host,
          port: this.port,
          url: `http://${this.host}:${this.port}`,
          pid: process.pid,
          routes: Array.from(this.routes.keys()),
        };

        log.log(`Mock server started on ${serverInfo.url}`);
        log.log(`Available routes: ${serverInfo.routes.length}`);
        resolve(serverInfo);
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        log.log("Mock server stopped");
        resolve();
      });
    });
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      host: this.host,
      port: this.port,
      url: this.isRunning ? `http://${this.host}:${this.port}` : null,
      routeCount: this.routes.size,
    };
  }

  /**
   * Add custom route handler
   */
  addHandler(
    method: string,
    path: string,
    handler: (
      req: Request,
      res: Response,
      operation: OpenAPIV3.OperationObject,
    ) => void,
  ): void {
    const routeKey = `${method.toUpperCase()} ${path}`;
    const route = this.routes.get(routeKey);

    if (route) {
      route.handler = handler;
    } else {
      log.warn(`Route not found: ${routeKey}`);
    }
  }

  /**
   * Get all available routes
   */
  getRoutes() {
    return Array.from(this.routes.entries()).map(([key, route]) => ({
      key,
      method: route.method,
      path: route.path,
      operationId: route.operation.operationId,
    }));
  }
}
