import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport, StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServerState, runningMcpServers } from '../mcp/state';
import { z } from 'zod';

// Define Zod schemas for MCP JSON validation
const McpServerConfigSchema = z.object({
  // For CLI servers
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  
  // For HTTP/SSE servers
  url: z.string().url().optional(),

  transport: z.enum(['http', 'sse']).optional(),
  
  // Environment variables for both types
  env: z.record(z.string(), z.string()).optional(),
}).refine(
  (data) => data.command !== undefined || data.url !== undefined,
  {
    message: "Must specify either 'command' or 'url'",
    path: [],
  }
);

const McpJsonConfigSchema = z.object({
  mcpServers: z.record(z.string(), McpServerConfigSchema),
});

// Define TypeScript types from Zod schemas
type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
type McpJsonConfig = z.infer<typeof McpJsonConfigSchema>;

/**
 * Get the path to the mcp.json file in the user data directory
 */
export const getMcpJsonFilePath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'mcp.json');
};

/**
 * Read and parse the mcp.json file
 */
export const readMcpJsonFile = async (): Promise<McpJsonConfig> => {
  const mcpJsonPath = getMcpJsonFilePath();
  try {
    const fileContent = await fs.readFile(mcpJsonPath, 'utf8');
    return validateMcpJsonConfig(JSON.parse(fileContent));
  } catch (error) {
    console.error('Error reading mcp.json file:', error);
    // Return empty config if file doesn't exist or is invalid
    return { mcpServers: {} };
  }
};

/**
 * Validate the MCP JSON configuration format using Zod schema
 * 
 * @param config The configuration object to validate
 * @returns Validated McpJsonConfig object
 * @throws ZodError if validation fails
 */
export const validateMcpJsonConfig = (config: unknown): McpJsonConfig => {
  try {
    // Parse and validate the config using Zod schema
    return McpJsonConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format the Zod error for better readability
      const formattedErrors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path ? `At ${path}: ` : ''}${err.message}`;
      }).join('\n');
      
      throw new Error(`Invalid MCP JSON configuration:\n${formattedErrors}`);
    }
    
    // Re-throw any other errors
    throw error;
  }
};

/**
 * Connect to an external MCP server based on configuration
 */
export const connectExternalMcp = async (serverName: string, config: McpServerConfig): Promise<McpServerState> => {
  console.info(`Starting external MCP server: ${serverName}`);
  
  // Check if the server is already running
  if (runningMcpServers[serverName] && runningMcpServers[serverName].status === 'running') {
    console.info(`External MCP server ${serverName} is already running`);
    return runningMcpServers[serverName];
  }

  // Check if the server is manually stopped
  if (runningMcpServers[serverName] && runningMcpServers[serverName].status === 'stopped') {
    console.info(`External MCP server ${serverName} is already stopped`);
    return runningMcpServers[serverName];
  }

  const serverState: McpServerState = {
    mcpId: serverName,
    status: 'starting',
    isExternal: true,
    startedAt: new Date(),
    mockProcesses: {},
    serverProcess: undefined,
    transport: undefined,
    client: undefined,
  };

  runningMcpServers[serverName] = serverState;
  
  try {
    // Create client
    const client = new Client({
      name: "AgentPort",
      version: "1.0.0"
    });
    
    // Handle CLI-based server
    if (config.command) {
        const params = config as StdioServerParameters;
        const transport = new StdioClientTransport(params);
          
        await client.connect(transport);

        serverState.transport = {type: 'stdio', params: params};
        serverState.client = client;
    }
    // Handle URL-based server (HTTP or SSE)
    else if (config.url) {
      const url = config.url;
      const isSSE = config.transport !== 'http';
      
      if (isSSE) {
        await client.connect(new SSEClientTransport(
            new URL(url)
          ));
        serverState.transport = {
          type: 'sse',
          url,
          options: {},
        };
        serverState.client = client;
      } else {
        await client.connect(new StreamableHTTPClientTransport(
          new URL(url)
        ));
        serverState.transport = {
            type: 'http',
            url,
            options: {},
          };
        serverState.client = client;
      }
    }
    
    // Update server status
    serverState.status = 'running';
    console.info(`External MCP server ${serverName} started successfully`);
    
    return serverState;
  } catch (error) {
    console.error(`Failed to start external MCP server ${serverName}:`, error);
    serverState.status = 'error';
    serverState.error = error instanceof Error ? error.message : String(error);
    return serverState;
  }
};

/**
 * Stop an external MCP server
 */
export const stopExternalMcp = async (serverName: string): Promise<McpServerState | null> => {
  console.info(`Stopping external MCP server: ${serverName}`);
  
  // Check if the server is running
  if (!runningMcpServers[serverName]) {
    console.info(`External MCP server ${serverName} is not running`);
    return null;
  }
  
  const serverState = runningMcpServers[serverName];
  
  try {
    // Close client if it exists
    if (serverState.client) {
      await serverState.client.close();
    }
    
    // Update server status
    serverState.status = 'stopped';
    serverState.stoppedAt = new Date();
    
    console.info(`External MCP server ${serverName} stopped successfully`);
    return serverState;
  } catch (error) {
    console.error(`Failed to stop external MCP server ${serverName}:`, error);
    serverState.status = 'error';
    serverState.error = error instanceof Error ? error.message : String(error);
    return serverState;
  }
};

/**
 * Start all external MCP servers defined in the mcp.json file
 */
export const connectAllExternalMcps = async (): Promise<Record<string, McpServerState>> => {
  console.info('Connecting to all external MCP servers...');
  
  try {
    // Read and validate the MCP JSON configuration
    const config = await readMcpJsonFile();
    const results: Record<string, McpServerState> = {};
    
    // Start each server
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        const serverState = await connectExternalMcp(serverName, serverConfig);
        results[serverName] = {
            ...serverState,
            client: undefined,
        };
      } catch (error) {
        console.error(`Failed to connect to external MCP server ${serverName}:`, error);
        results[serverName] = {
          mcpId: serverName,
          status: 'error',
          mockProcesses: {},
          error: error instanceof Error ? error.message : String(error),
          isExternal: true,
          startedAt: new Date(),
        };
      }
    }
    
    console.info('All external MCP servers connected');
    return results;
  } catch (error) {
    console.error('Error connecting to external MCP servers:', error);
    throw error;
  }
};
