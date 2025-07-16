import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServerState, runningMcpServers } from "../mcp/state";
import { z } from "zod";
import log from "electron-log";
import { workspaceDb } from "../db/workspace-db";
import { BrowserWindow } from "electron";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "../../ipc/external-mcp/external-mcp-channels";
import { addMcpLog } from "../mcp";
import {
  shouldEnableOAuth,
  setupOAuthAuthentication,
  cleanupOAuthAuthentication,
  type McpOAuthSetup,
} from "../mcp-oauth";

// Health check polling intervals
const HEALTH_CHECK_INTERVAL = 3000; // 3 seconds
const RECONNECTION_DELAY = 5000; // 5 seconds

// Health check timers for each server
const healthCheckTimers = new Map<string, NodeJS.Timeout>();

// Define Zod schemas for MCP JSON validation
const McpServerConfigSchema = z
  .object({
    // For CLI servers
    command: z.string().optional(),
    args: z.array(z.string()).optional(),

    // For HTTP/SSE servers
    url: z.string().url().optional(),

    transport: z.enum(["http", "sse"]).optional(),

    // Environment variables for both types
    env: z.record(z.string(), z.string()).optional(),

    // Headers for HTTP/SSE servers
    headers: z.record(z.string(), z.string()).optional(),
  })
  .refine((data) => data.command !== undefined || data.url !== undefined, {
    message: "Must specify either 'command' or 'url'",
    path: [],
  });

const McpJsonConfigSchema = z.object({
  mcpServers: z.record(z.string(), McpServerConfigSchema),
});

// Define TypeScript types from Zod schemas
type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
type McpJsonConfig = z.infer<typeof McpJsonConfigSchema>;

/**
 * Get the path to the mcp.json file in the current workspace directory
 */
export const getMcpJsonFilePath = async (): Promise<string> => {
  try {
    const currentWorkspace = await workspaceDb.getCurrentWorkspace();
    const workspaceDataDir = workspaceDb.getWorkspaceDataDir(
      currentWorkspace.id,
    );
    return path.join(workspaceDataDir, "mcp.json");
  } catch (error) {
    // Fallback to root directory if workspace system fails
    console.error(
      "Failed to get workspace for mcp.json, falling back to root:",
      error,
    );
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, "mcp.json");
  }
};

/**
 * Read and parse the mcp.json file
 */
export const readMcpJsonFile = async (): Promise<McpJsonConfig> => {
  const mcpJsonPath = await getMcpJsonFilePath();
  try {
    const fileContent = await fs.readFile(mcpJsonPath, "utf8");
    return validateMcpJsonConfig(JSON.parse(fileContent));
  } catch (error) {
    log.error("Error reading mcp.json file:", error);
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
      const formattedErrors = error.errors
        .map((err) => {
          const path = err.path.join(".");
          return `${path ? `At ${path}: ` : ""}${err.message}`;
        })
        .join("\n");

      throw new Error(`Invalid MCP JSON configuration:\n${formattedErrors}`);
    }

    // Re-throw any other errors
    throw error;
  }
};

/**
 * Broadcast external MCP server state changes to the renderer process
 */
export const broadcastExternalMcpServersUpdate = () => {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    // Create serializable server states for broadcasting
    const serializableStates: Record<string, McpServerState> = {};

    Object.entries(runningMcpServers).forEach(([serverName, serverState]) => {
      if (serverState.isExternal) {
        serializableStates[serverName] = {
          ...serverState,
          client: undefined, // Remove non-serializable client
          transport: serverState.transport, // Keep transport info
        };
      }
    });

    // Broadcast the updated server states
    mainWindow.webContents.send(
      EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
      serializableStates,
    );
  }
};
/**
 * Start health check polling for a server
 */
const startHealthCheck = (serverName: string) => {
  // Clear any existing timer
  stopHealthCheck(serverName);

  const timer = setInterval(async () => {
    await performHealthCheck(serverName);
  }, HEALTH_CHECK_INTERVAL);

  healthCheckTimers.set(serverName, timer);
  log.info(`Health check started for server: ${serverName}`);
};

/**
 * Stop health check polling for a server
 */
const stopHealthCheck = (serverName: string) => {
  const timer = healthCheckTimers.get(serverName);
  if (timer) {
    clearInterval(timer);
    healthCheckTimers.delete(serverName);
    log.info(`Health check stopped for server: ${serverName}`);
  }
};

/**
 * Perform a single health check for a server using client.ping()
 */
const performHealthCheck = async (serverName: string) => {
  const serverState = runningMcpServers[serverName];
  if (!serverState || serverState.status === "stopped") {
    stopHealthCheck(serverName);
    return;
  }

  // Only perform health check for running servers
  if (serverState.status !== "running" || !serverState.client) {
    // Try to reconnect if the server is in error state
    if (serverState.status === "error") {
      await attemptReconnection(serverName);
    }
    return;
  }

  try {
    // Use client.ping() to check if the server is responsive
    await serverState.client.ping();

    // If we get here, the server is healthy
    if (serverState.status !== "running") {
      serverState.status = "running";
      delete serverState.error;
      broadcastExternalMcpServersUpdate();

      log.info(`Server ${serverName} is now healthy`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    log.warn(`Failed to ping the server ${serverName}: ${errorMessage}`);

    // Mark server as unhealthy
    serverState.status = "error";
    serverState.error = `Failed to ping the server: ${errorMessage}`;
    serverState.stoppedAt = new Date();

    broadcastExternalMcpServersUpdate();

    // Schedule a reconnection attempt
    setTimeout(() => {
      attemptReconnection(serverName);
    }, RECONNECTION_DELAY);
  }
};

/**
 * Attempt to reconnect to an external MCP server
 */
const attemptReconnection = async (serverName: string) => {
  const serverState = runningMcpServers[serverName];
  if (!serverState || serverState.status === "stopped") {
    // Don't reconnect if server was manually stopped
    return;
  }

  try {
    addMcpLog(
      serverName,
      "info",
      `Attempting to reconnect to server: ${serverName}`,
      true,
    );

    // Read current config and attempt reconnection
    const config = await readMcpJsonFile();
    const serverConfig = config.mcpServers[serverName];

    if (serverConfig) {
      // Force reconnection
      await connectExternalMcp(serverName, serverConfig, true);
      broadcastExternalMcpServersUpdate();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addMcpLog(
      serverName,
      "error",
      `Failed to reconnect to server ${serverName}: ${errorMessage}`,
      true,
    );
    log.error(`Failed to reconnect to server ${serverName}:`, error);
  }
};

/**
 * Connect to an external MCP server based on configuration
 */
export const connectExternalMcp = async (
  serverName: string,
  config: McpServerConfig,
  force?: boolean,
): Promise<McpServerState> => {
  log.info(`Starting external MCP server: ${serverName}`);

  // Check if the server is already running
  if (
    runningMcpServers[serverName] &&
    runningMcpServers[serverName].status === "running"
  ) {
    if (!force) {
      log.info(`External MCP server ${serverName} is already running`);
      return runningMcpServers[serverName];
    } else {
      // Force reconnection - stop the existing server first
      await stopExternalMcp(serverName);
    }
  }

  // Check if the server is manually stopped
  if (
    !force &&
    runningMcpServers[serverName] &&
    runningMcpServers[serverName].status === "stopped"
  ) {
    log.info(`External MCP server ${serverName} is already stopped`);
    return runningMcpServers[serverName];
  }

  const serverState: McpServerState = {
    mcpId: serverName,
    status: "starting",
    isExternal: true,
    startedAt: new Date(),
    mockProcesses: {},
    expressServer: undefined,
    transport: undefined,
    client: undefined,
  };

  runningMcpServers[serverName] = serverState;

  // Setup OAuth authentication if enabled
  let oauthSetup: McpOAuthSetup | null = null;

  try {
    stopHealthCheck(serverName);

    // Check if OAuth should be enabled for this server
    if (config.url && (await shouldEnableOAuth(serverName, config.url))) {
      oauthSetup = await setupOAuthAuthentication({
        serverName,
        serverUrl: config.url,
        clientName: `Summon - ${serverName}`,
        clientUri: "https://github.com/modelcontextprotocol/summon-app",
      });
    }

    // Create client
    const client = new Client({
      name: "Summon",
      version: "1.0.0",
    });

    // Handle CLI-based server
    if (config.command) {
      const params = config as StdioServerParameters;
      params.env = {
        ...(params.env || {}),
        ...getDefaultEnvironment(),
        ELECTRON_RUN_AS_NODE: "1",
      };
      params.stderr = "pipe"; // Enable stderr capture
      const transport = new StdioClientTransport(params);

      transport.onmessage = (message) => {
        const stringifiedMessage = JSON.stringify(message);
        if (stringifiedMessage.includes(`"result":{}`)) return;
        addMcpLog(
          serverName,
          "debug",
          `← Received: ${stringifiedMessage}`,
          true,
        );
      };

      transport.onerror = (error) => {
        addMcpLog(
          serverName,
          "error",
          `Transport error: ${error.message}`,
          true,
        );
      };

      transport.onclose = () => {
        addMcpLog(serverName, "info", `Transport connection closed`, true);
      };

      await client.connect(transport);

      // Capture stderr output if available
      const stderrStream = transport.stderr;
      if (stderrStream) {
        stderrStream.on("data", (data) => {
          const message = data.toString().trim();
          if (message) {
            addMcpLog(serverName, "warn", `stderr: ${message}`, true);
          }
        });
      }

      // Log process PID if available
      if (transport.pid) {
        addMcpLog(
          serverName,
          "info",
          `Process started with PID: ${transport.pid}`,
          true,
        );
      }

      serverState.transport = { type: "stdio", params: params };
      serverState.client = client;
    }
    // Handle URL-based server (HTTP or SSE)
    else if (config.url) {
      const url = config.url;
      const isSSE = url.includes("/sse");
      const isHTTP = url.includes("/mcp");

      // Helper function to handle OAuth authentication
      const handleOAuthAuth = async (
        transport: StreamableHTTPClientTransport | SSEClientTransport,
      ) => {
        if (oauthSetup) {
          try {
            await client.connect(transport);
          } catch (error) {
            if (error instanceof UnauthorizedError) {
              addMcpLog(
                serverName,
                "info",
                "Authentication required, starting OAuth flow",
                true,
              );

              // Wait for OAuth authentication
              const authCode = await oauthSetup.waitForAuth();
              addMcpLog(
                serverName,
                "info",
                "OAuth authorization code received",
                true,
              );

              // Complete the OAuth flow
              await transport.finishAuth(authCode);
              addMcpLog(
                serverName,
                "info",
                "OAuth authentication completed",
                true,
              );
            } else {
              throw error;
            }
          }
        } else {
          await client.connect(transport);
        }
      };

      if (isSSE) {
        const transport = new SSEClientTransport(new URL(url), {
          authProvider: oauthSetup?.authProvider,
          requestInit: {
            headers: config.headers,
          },
        });

        transport.onmessage = (message) => {
          const stringifiedMessage = JSON.stringify(message);
          if (stringifiedMessage.includes(`"result":{}`)) return;
          addMcpLog(
            serverName,
            "debug",
            `← Received: ${stringifiedMessage}`,
            true,
          );
        };

        transport.onerror = (error) => {
          addMcpLog(
            serverName,
            "error",
            `Transport error: ${error.message}`,
            true,
          );
        };

        transport.onclose = () => {
          addMcpLog(serverName, "info", `Transport connection closed`, true);
        };

        await handleOAuthAuth(transport);

        serverState.transport = {
          type: "sse",
          url,
          options: {},
        };
        serverState.client = client;
      } else if (isHTTP) {
        const transport = new StreamableHTTPClientTransport(new URL(url), {
          authProvider: oauthSetup?.authProvider,
          requestInit: {
            headers: config.headers,
          },
        });

        transport.onmessage = (message) => {
          const stringifiedMessage = JSON.stringify(message);
          if (stringifiedMessage.includes(`"result":{}`)) return;
          addMcpLog(
            serverName,
            "debug",
            `← Received: ${stringifiedMessage}`,
            true,
          );
        };

        transport.onerror = (error) => {
          addMcpLog(
            serverName,
            "error",
            `Transport error: ${error.message}`,
            true,
          );
        };

        transport.onclose = () => {
          addMcpLog(serverName, "info", `Transport connection closed`, true);
        };

        await handleOAuthAuth(transport);

        serverState.transport = {
          type: "http",
          url,
          options: {},
        };
        serverState.client = client;
      } else {
        throw new Error("Invalid URL, must end with /sse or /mcp");
      }
    }

    // Update server status
    serverState.status = "running";
    delete serverState.error; // Clear any previous error

    log.info(`External MCP server ${serverName} started successfully`);

    return serverState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addMcpLog(
      serverName,
      "error",
      `Failed to start external MCP server ${serverName}: ${errorMessage}`,
      true,
    );
    log.error(`Failed to start external MCP server ${serverName}:`, error);
    serverState.status = "error";
    serverState.error = errorMessage;

    // Cleanup OAuth setup if it was created
    if (oauthSetup) {
      oauthSetup.cleanup();
    }

    return serverState;
  } finally {
    // Start health check polling for this server
    startHealthCheck(serverName);
  }
};

/**
 * Stop an external MCP server
 */
export const stopExternalMcp = async (
  serverName: string,
  removeFromState?: boolean,
): Promise<McpServerState | null> => {
  log.info(`Stopping external MCP server: ${serverName}`);

  // Check if the server is running
  if (!runningMcpServers[serverName]) {
    log.info(`External MCP server ${serverName} is not running`);
    return null;
  }

  const serverState = runningMcpServers[serverName];

  try {
    // Stop health check polling for this server
    stopHealthCheck(serverName);

    // Cleanup OAuth authentication for this server
    cleanupOAuthAuthentication(serverName);

    // Close client if it exists
    if (serverState.client) {
      await serverState.client.close();
      delete serverState.client;
    }

    // Update server status
    serverState.status = "stopped";
    serverState.stoppedAt = new Date();
    delete serverState.error; // Clear any previous error

    log.info(`External MCP server ${serverName} stopped successfully`);

    if (removeFromState) {
      delete runningMcpServers[serverName];
    }

    return serverState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Failed to stop external MCP server ${serverName}:`, error);
    serverState.status = "error";
    serverState.error = errorMessage;

    return serverState;
  }
};

/**
 * Start all external MCP servers defined in the mcp.json file
 */
export const connectAllExternalMcps = async (
  force?: boolean,
): Promise<Record<string, McpServerState>> => {
  log.info("Connecting to all external MCP servers...");

  try {
    // Read and validate the MCP JSON configuration
    const config = await readMcpJsonFile();
    const results: Record<string, McpServerState> = {};

    // Start each server
    for (const [serverName, serverConfig] of Object.entries(
      config.mcpServers,
    )) {
      try {
        const serverState = await connectExternalMcp(
          serverName,
          serverConfig,
          force,
        );
        results[serverName] = {
          ...serverState,
          client: undefined,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addMcpLog(
          serverName,
          "error",
          `Failed to connect to external MCP server ${serverName}: ${errorMessage}`,
          true,
        );
        log.error(
          `Failed to connect to external MCP server ${serverName}:`,
          error,
        );
        results[serverName] = {
          mcpId: serverName,
          status: "error",
          mockProcesses: {},
          error: errorMessage,
          isExternal: true,
          startedAt: new Date(),
        };
      }
    }

    log.info("All external MCP servers connected");

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error("Error connecting to external MCP servers:", errorMessage);
    throw error;
  }
};

/**
 * Get the current state of all external MCP servers
 */
export const getExternalMcpServersState = (): Record<
  string,
  McpServerState
> => {
  const externalServers: Record<string, McpServerState> = {};

  Object.entries(runningMcpServers).forEach(([serverName, serverState]) => {
    if (serverState.isExternal) {
      externalServers[serverName] = {
        ...serverState,
        client: undefined, // Remove non-serializable client
      };
    }
  });

  return externalServers;
};

/**
 * Get the current state of a specific external MCP server
 */
export const getExternalMcpServerState = (
  serverName: string,
): McpServerState | null => {
  const serverState = runningMcpServers[serverName];
  if (!serverState || !serverState.isExternal) {
    return null;
  }

  return {
    ...serverState,
    client: undefined, // Remove non-serializable client
  };
};

/**
 * Stop all external MCP servers
 */
export const stopAllExternalMcps = async (
  removeFromState?: boolean,
): Promise<void> => {
  log.info("Stopping all external MCP servers...");

  const externalServers = Object.entries(runningMcpServers).filter(
    ([, serverState]) => serverState.isExternal,
  );

  const stopPromises = externalServers.map(([serverName]) =>
    stopExternalMcp(serverName, removeFromState),
  );

  await Promise.allSettled(stopPromises);

  log.info("All external MCP servers stopped");
};
