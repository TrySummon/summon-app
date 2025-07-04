/**
 * Stream adapter for Protocol Servers using StreamableHTTP
 */

/**
 * Builds StreamableHTTP adapter code
 *
 * @returns Generated adapter code
 */
export function buildAdapterCode(): string {
  const streamCode = `/**
 * StreamableHTTP adapter for Protocol Server communication
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { v4 as generateId } from 'uuid';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InitializeRequestSchema, JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { toReqRes, toFetchResponse } from 'fetch-to-node';

// Import service configuration
import { SERVICE_NAME, SERVICE_VERSION } from './index.js';

// Protocol constants
const SESSION_HEADER = "mcp-session-id";
const RPC_VERSION = "2.0";

/**
 * StreamableHTTP Protocol Handler
 */
class StreamableHttpServer {
  server: Server;
  // Active transports mapped by session
  activeSessions: {[sessionId: string]: StreamableHTTPServerTransport} = {};
  
  constructor(server: Server) {
    this.server = server;
  }
  
  /**
   * Process GET requests
   */
  async processGet(ctx: any) {
    console.error("GET method not supported - StreamableHTTP requires POST");
    return ctx.text('Method Not Supported', 405, {
      'Allow': 'POST'
    });
  }
  
  /**
   * Process POST requests
   */
  async processPost(ctx: any) {
    const sessionHeader = ctx.req.header(SESSION_HEADER);
    console.error(\`POST received \${sessionHeader ? 'with session: ' + sessionHeader : 'without session'}\`);
    
    try {
      const payload = await ctx.req.json();
      
      // Convert to Node.js request/response
      const { req, res } = toReqRes(ctx.req.raw);
      
      // Handle existing session
      if (sessionHeader && this.activeSessions[sessionHeader]) {
        const transport = this.activeSessions[sessionHeader];
        
        // Process with transport
        await transport.handleRequest(req, res, payload);
        
        // Monitor response closure
        res.on('close', () => {
          console.error(\`Session request closed: \${sessionHeader}\`);
        });
        
        // Return converted response
        return toFetchResponse(res);
      }
      
      // Handle new session creation
      if (!sessionHeader && this.isInitRequest(payload)) {
        console.error("Creating transport for initialization");
        
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => generateId(),
        });
        
        // Configure error handling
        transport.onerror = (error) => {
          console.error('Transport error:', error);
        };
        
        // Connect transport to server
        await this.server.connect(transport);
        
        // Process initialization
        await transport.handleRequest(req, res, payload);
        
        // Store session if created
        const sessionId = transport.sessionId;
        if (sessionId) {
          console.error(\`Session created: \${sessionId}\`);
          this.activeSessions[sessionId] = transport;
          
          // Configure cleanup
          transport.onclose = () => {
            console.error(\`Session terminated: \${sessionId}\`);
            delete this.activeSessions[sessionId];
          };
        }
        
        // Monitor response
        res.on('close', () => {
          console.error(\`Initial request closed\`);
        });
        
        // Return converted response
        return toFetchResponse(res);
      }
      
      // Invalid scenario
      return ctx.json(
        this.buildError("Invalid request: missing session or not initialization."),
        400
      );
    } catch (error) {
      console.error('Request processing error:', error);
      return ctx.json(
        this.buildError("Internal processing error."),
        500
      );
    }
  }
  
  /**
   * Build JSON-RPC error
   */
  private buildError(msg: string): JSONRPCError {
    return {
      jsonrpc: RPC_VERSION,
      error: {
        code: -32000,
        message: msg,
      },
      id: generateId(),
    };
  }
  
  /**
   * Check if request is initialization
   */
  private isInitRequest(payload: any): boolean {
    const checkInit = (item: any) => {
      const validation = InitializeRequestSchema.safeParse(item);
      return validation.success;
    };
    
    if (Array.isArray(payload)) {
      return payload.some(req => checkInit(req));
    }
    
    return checkInit(payload);
  }
}

/**
 * Initialize StreamableHTTP adapter
 * 
 * @param server The Server instance
 * @param servicePort The port to bind (default: port)
 * @returns The Hono application
 */
export async function initializeStreamAdapter(server: Server, servicePort: number) {
  // Create Hono application
  const streamApp = new Hono();
  
  // Enable CORS
  streamApp.use('*', cors());
  
  // Create protocol handler
  const protocolHandler = new StreamableHttpServer(server);
  
  // Health endpoint
  streamApp.get('/health', (ctx) => {
    return ctx.json({ 
      status: 'healthy', 
      service: SERVICE_NAME, 
      version: SERVICE_VERSION 
    });
  });
  
  // Protocol endpoint
  streamApp.get("/mcp", (ctx) => protocolHandler.processGet(ctx));
  streamApp.post("/mcp", (ctx) => protocolHandler.processPost(ctx));
  
  
  // Start server
  serve({
    fetch: streamApp.fetch,
    port: servicePort
  }, (details) => {
    console.error(\`Protocol StreamableHTTP Server active at http://localhost:\${details.port}\`);
    console.error(\`- Protocol Endpoint: http://localhost:\${details.port}/mcp\`);
    console.error(\`- Health Status: http://localhost:\${details.port}/health\`);
  });
  
  return streamApp;
}
`;

  return streamCode;
}
