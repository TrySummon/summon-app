/**
 * StreamableHTTP server setup for HTTP-based MCP communication using Express
 */
import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  InitializeRequestSchema,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";

// Constants
const SESSION_ID_HEADER_NAME = "mcp-session-id";
const JSON_RPC = "2.0";

/**
 * StreamableHTTP MCP Server handler for Express
 */
class MCPStreamableExpressServer {
  server: Server;
  // Store active transports by session ID
  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Handle GET requests (typically used for static files)
   */
  async handleGetRequest(req: Request, res: Response) {
    console.error(
      "GET request received - StreamableHTTP transport only supports POST",
    );
    res.status(405).set("Allow", "POST").send("Method Not Allowed");
  }

  /**
   * Handle POST requests (all MCP communication)
   */
  async handlePostRequest(req: Request, res: Response) {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string;
    console.error(
      `POST request received ${sessionId ? "with session ID: " + sessionId : "without session ID"}`,
    );

    try {
      const body = req.body;

      // Reuse existing transport if we have a session ID
      if (sessionId && this.transports[sessionId]) {
        const transport = this.transports[sessionId];

        // Handle the request with the transport
        await transport.handleRequest(req, res, body);

        // Cleanup when the response ends
        res.on("close", () => {
          console.error(`Request closed for session ${sessionId}`);
        });

        return;
      }

      // Create new transport for initialize requests
      if (!sessionId && this.isInitializeRequest(body)) {
        console.error(
          "Creating new StreamableHTTP transport for initialize request",
        );

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => uuid(),
          enableDnsRebindingProtection: true,
        });

        // Add error handler for debug purposes
        transport.onerror = (err) => {
          console.error("StreamableHTTP transport error:", err);
        };

        // Connect the transport to the MCP server
        await this.server.connect(transport);

        // Handle the request with the transport
        await transport.handleRequest(req, res, body);

        // Store the transport if we have a session ID
        const newSessionId = transport.sessionId;
        if (newSessionId) {
          console.error(`New session established: ${newSessionId}`);
          this.transports[newSessionId] = transport;

          // Set up clean-up for when the transport is closed
          transport.onclose = () => {
            console.error(`Session closed: ${newSessionId}`);
            delete this.transports[newSessionId];
          };
        }

        // Cleanup when the response ends
        res.on("close", () => {
          console.error(`Request closed for new session`);
        });

        return;
      }

      // Invalid request (no session ID and not initialize)
      res
        .status(400)
        .json(
          this.createErrorResponse(
            "Bad Request: invalid session ID or method.",
          ),
        );
    } catch (error) {
      console.error("Error handling MCP request:", error);
      res.status(500).json(this.createErrorResponse("Internal server error."));
    }
  }

  /**
   * Create a JSON-RPC error response
   */
  private createErrorResponse(message: string): JSONRPCError {
    return {
      jsonrpc: JSON_RPC,
      error: {
        code: -32000,
        message: message,
      },
      id: uuid(),
    };
  }

  /**
   * Check if the request is an initialize request
   */
  private isInitializeRequest(body: unknown): boolean {
    const isInitial = (data: unknown) => {
      const result = InitializeRequestSchema.safeParse(data);
      return result.success;
    };

    if (Array.isArray(body)) {
      return body.some((request) => isInitial(request));
    }

    return isInitial(body);
  }
}

/**
 * Sets up a web server for the MCP server using StreamableHTTP transport with Express
 *
 * @param server The MCP Server instance
 * @returns The Express app instance
 */
export function setupStreamableExpressServer(
  server: Server,
): express.Application {
  // Create Express app
  const app = express();

  // Enable CORS
  app.use(cors());

  // Parse JSON bodies
  app.use(express.json());

  // Create MCP handler
  const mcpHandler = new MCPStreamableExpressServer(server);

  // Serve static files
  app.use(express.static("public"));

  // Main MCP endpoint supporting both GET and POST
  app.get("/mcp", (req: Request, res: Response) =>
    mcpHandler.handleGetRequest(req, res),
  );
  app.post("/mcp", (req: Request, res: Response) =>
    mcpHandler.handlePostRequest(req, res),
  );
  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  return app;
}
