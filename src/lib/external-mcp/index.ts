import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
  StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServerState, runningMcpServers } from "../mcp/state";
import { z } from "zod";
import log from "electron-log";
import { workspaceDb } from "../db/workspace-db";

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
 * Connect to an external MCP server based on configuration
 */
export const connectExternalMcp = async (
  serverName: string,
  config: McpServerConfig,
  force?: boolean,
): Promise<McpServerState> => {
  // Import addMcpLog from the main MCP lib
  const { addMcpLog } = await import("../mcp");

  addMcpLog(
    serverName,
    "info",
    `Starting external MCP server: ${serverName}`,
    true,
  );
  log.info(`Starting external MCP server: ${serverName}`);

  // Check if the server is already running
  if (
    runningMcpServers[serverName] &&
    runningMcpServers[serverName].status === "running"
  ) {
    addMcpLog(
      serverName,
      "info",
      `External MCP server ${serverName} is already running`,
      true,
    );
    log.info(`External MCP server ${serverName} is already running`);
    return runningMcpServers[serverName];
  }

  // Check if the server is manually stopped
  if (
    !force &&
    runningMcpServers[serverName] &&
    runningMcpServers[serverName].status === "stopped"
  ) {
    addMcpLog(
      serverName,
      "info",
      `External MCP server ${serverName} is already stopped`,
      true,
    );
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

  try {
    // Create client
    const client = new Client({
      name: "Summon",
      version: "1.0.0",
    });

    // Handle CLI-based server
    if (config.command) {
      addMcpLog(
        serverName,
        "info",
        `Connecting to CLI-based MCP server: ${config.command}`,
        true,
      );
      const params = config as StdioServerParameters;
      params.env = {
        ...(params.env || {}),
        ...getDefaultEnvironment(),
        ELECTRON_RUN_AS_NODE: "1",
      };
      params.stderr = "pipe"; // Enable stderr capture
      const transport = new StdioClientTransport(params);

      // Hook into transport events for detailed logging
      transport.onmessage = (message) => {
        addMcpLog(
          serverName,
          "debug",
          `← Received: ${JSON.stringify(message)}`,
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

      if (isSSE) {
        addMcpLog(
          serverName,
          "info",
          `Connecting to SSE MCP server: ${url}`,
          true,
        );
        const transport = new SSEClientTransport(new URL(url), {
          requestInit: {
            headers: config.headers,
          },
        });

        // Hook into transport events for detailed logging
        transport.onmessage = (message) => {
          addMcpLog(
            serverName,
            "debug",
            `← Received: ${JSON.stringify(message)}`,
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

        serverState.transport = {
          type: "sse",
          url,
          options: {},
        };
        serverState.client = client;
      } else if (isHTTP) {
        addMcpLog(
          serverName,
          "info",
          `Connecting to HTTP MCP server: ${url}`,
          true,
        );
        const transport = new StreamableHTTPClientTransport(new URL(url), {
          requestInit: {
            headers: config.headers,
          },
        });

        // Hook into transport events for detailed logging
        transport.onmessage = (message) => {
          addMcpLog(
            serverName,
            "debug",
            `← Received: ${JSON.stringify(message)}`,
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
    addMcpLog(
      serverName,
      "info",
      `External MCP server ${serverName} started successfully`,
      true,
    );
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
    return serverState;
  }
};

/**
 * Stop an external MCP server
 */
export const stopExternalMcp = async (
  serverName: string,
  removeFromState?: boolean,
): Promise<McpServerState | null> => {
  // Import addMcpLog from the main MCP lib
  const { addMcpLog } = await import("../mcp");

  addMcpLog(
    serverName,
    "info",
    `Stopping external MCP server: ${serverName}`,
    true,
  );
  log.info(`Stopping external MCP server: ${serverName}`);

  // Check if the server is running
  if (!runningMcpServers[serverName]) {
    addMcpLog(
      serverName,
      "info",
      `External MCP server ${serverName} is not running`,
      true,
    );
    log.info(`External MCP server ${serverName} is not running`);
    return null;
  }

  const serverState = runningMcpServers[serverName];

  try {
    // Close client if it exists
    if (serverState.client) {
      await serverState.client.close();
      delete serverState.client;
    }

    // Update server status
    serverState.status = "stopped";
    serverState.stoppedAt = new Date();

    addMcpLog(
      serverName,
      "info",
      `External MCP server ${serverName} stopped successfully`,
      true,
    );
    log.info(`External MCP server ${serverName} stopped successfully`);
    if (removeFromState) {
      delete runningMcpServers[serverName];
    }
    return serverState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addMcpLog(
      serverName,
      "error",
      `Failed to stop external MCP server ${serverName}: ${errorMessage}`,
      true,
    );
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
  // Import addMcpLog from the main MCP lib
  const { addMcpLog } = await import("../mcp");

  addMcpLog(
    "system",
    "info",
    "Connecting to all external MCP servers...",
    true,
  );
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

    addMcpLog("system", "info", "All external MCP servers connected", true);
    log.info("All external MCP servers connected");
    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addMcpLog(
      "system",
      "error",
      `Error connecting to external MCP servers: ${errorMessage}`,
      true,
    );
    log.error("Error connecting to external MCP servers:", error);
    throw error;
  }
};
