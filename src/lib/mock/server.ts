import express, { Request, Response, Application } from "express";
import cors from "cors";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";
import { Server } from "http";
import log from "electron-log/main";

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
   * Basic request validation
   */
  private validateRequest(
    req: Request,
    operation: OpenAPIV3.OperationObject,
  ): string | null {
    const parameters =
      (operation.parameters as OpenAPIV3.ParameterObject[]) || [];

    for (const param of parameters) {
      if (param.required) {
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
        }

        if (value === undefined || value === null || value === "") {
          return `Missing required parameter: ${param.name}`;
        }
      }
    }

    return null;
  }

  /**
   * Create default handler for an operation
   */
  private createDefaultHandler(operation: OpenAPIV3.OperationObject) {
    return (req: Request, res: Response): void => {
      const { status, mock } = this.generateMockResponse(operation, req);
      res.status(status).json(mock);
    };
  }

  /**
   * Generate mock response based on OpenAPI operation
   */
  private generateMockResponse(
    operation: OpenAPIV3.OperationObject,
    req: Request = {} as Request,
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
          req,
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
   * Generate mock data from JSON schema
   */
  private generateMockFromSchema(
    schema: OpenAPIV3.SchemaObject,
    req: Request = {} as Request,
  ): unknown {
    if (!schema) return null;

    // Handle examples
    if (schema.example !== undefined) {
      return schema.example;
    }

    const obj: Record<string, unknown> = {};

    // Handle different types
    switch (schema.type) {
      case "object":
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, propertySchema]) => {
            obj[key] = this.generateMockFromSchema(
              propertySchema as OpenAPIV3.SchemaObject,
              req,
            );
          });
        }
        return obj;

      case "array":
        if (schema.items) {
          const items = this.generateMockFromSchema(
            schema.items as OpenAPIV3.SchemaObject,
            req,
          );
          const length = schema.minItems || 1;
          return Array(length)
            .fill(null)
            .map((_, i) =>
              typeof items === "object" && items !== null
                ? { ...items, id: i + 1 }
                : items,
            );
        }
        return ["item"];

      case "string":
        if (schema.enum) return schema.enum[0];
        if (schema.format === "email") return "test@example.com";
        if (schema.format === "date") return "2023-01-01";
        if (schema.format === "date-time") return new Date().toISOString();
        if (schema.format === "uuid")
          return "123e4567-e89b-12d3-a456-426614174000";
        if (schema.format === "uri") return "https://example.com";
        return (schema.default as string) || "example string";

      case "number":
        return schema.default !== undefined
          ? (schema.default as number)
          : schema.minimum || 42;

      case "integer":
        return schema.default !== undefined
          ? (schema.default as number)
          : schema.minimum || 1;

      case "boolean":
        return schema.default !== undefined
          ? (schema.default as boolean)
          : true;

      default:
        return schema.default || null;
    }
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
