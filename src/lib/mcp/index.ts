import { app, BrowserWindow } from "electron";
import * as fs from "fs/promises";
import * as path from "path";

import log from "electron-log";
import { mockApi } from "../mock";
import { findFreePort } from "../port";
import { getMcpImplPath, getMcpImplToolsDir, mcpDb } from "../db/mcp-db";
import { createMcpServer, loadToolsFromDirectory } from "./server";
import { setupStreamableExpressServer } from "./streamable-express-server";
import { McpServerState, runningMcpServers } from "./state";
import archiver from "archiver";
import { shell } from "electron";
import { createWriteStream } from "fs";
import { JSONSchema7 } from "json-schema";
import {
  buildEnvExampleCode,
  buildLinterConfig,
  buildIgnorePatterns,
  buildTestConfig,
  buildMapperCode,
  buildServerCode,
  buildMcpToolDefinitions,
  buildPackageJsonCode,
  buildFormatterConfig,
  buildReadmeCode,
  buildAdapterCode,
  buildTypeScriptConfig,
  buildToolCode,
} from "./generator";
import { getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { stopExternalMcp } from "../external-mcp";

import { faker } from "@faker-js/faker";
import { JSONSchemaFaker } from "json-schema-faker";
import { ensureDirectoryExists, writeFileWithDir } from "../file";
import { buildVariableName } from "./generator/auth";

// Configure JSON Schema Faker
JSONSchemaFaker.extend("faker", () => faker);

// Configure options for better compatibility
JSONSchemaFaker.option({
  // Don't fail on unknown formats, just use string
  failOnInvalidFormat: false,
  // Don't fail on unknown types, use string as fallback
  failOnInvalidTypes: false,
  // Use more realistic fake data
  useDefaultValue: true,
  // Handle edge cases gracefully
  ignoreMissingRefs: true,
});

/**
 * Generates an MCP server based on OpenAPI specification and writes all files to the specified output directory
 *
 * @param options Configuration options for MCP generation
 */
export async function generateMcpImpl(mcpId: string) {
  const mcp = await mcpDb.getMcpById(mcpId, true);

  if (!mcp) {
    throw new Error("MCP not found");
  }

  const output = await getMcpImplPath(mcp.id);

  // Determine server name and version
  const serverName = mcp.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const serverVersion = "1.0.0";
  const transport: string = "streamable-http";
  const port = 3000;

  // Define file paths
  const srcDir = path.join(output, "src");
  const toolsDir = path.join(srcDir, "tools");
  const toolFilePath = path.join(toolsDir, "index.ts");
  const adapterFilePath = path.join(srcDir, "adapter.ts");
  const serverFilePath = path.join(srcDir, "index.ts");
  const packageJsonPath = path.join(output, "package.json");
  const tsconfigPath = path.join(output, "tsconfig.json");
  const gitignorePath = path.join(output, ".gitignore");
  const eslintPath = path.join(output, ".eslintrc.json");
  const prettierPath = path.join(output, ".prettierrc");
  const jestConfigPath = path.join(output, "jest.config.js");
  const envExamplePath = path.join(output, ".env.example");
  const docsDir = path.join(output, "docs");

  const publicDir = path.join(output, "public");

  // Ensure the main directories exist
  await ensureDirectoryExists(srcDir);
  await ensureDirectoryExists(docsDir);

  // Generate and write core files
  log.info("Generating tools code...");
  const tools = await buildMcpToolDefinitions(mcp.apiGroups);

  const tags = tools
    .map((tool) => tool.tags)
    .flat()
    .filter((tag, index, self) => self.indexOf(tag) === index);

  await Promise.all(
    tools.map((tool) => {
      const toolFilePath = path.join(toolsDir, `${tool.name}.json`);
      const toolContent = JSON.stringify(tool, null, 2);
      return writeFileWithDir(toolFilePath, toolContent);
    }),
  );

  log.info("Generating tool code...");
  const toolCode = await buildToolCode();
  await writeFileWithDir(toolFilePath, toolCode);

  log.info("Generating adapter code...");
  const adapterCode = buildAdapterCode();
  await writeFileWithDir(adapterFilePath, adapterCode);

  log.info("Generating server code...");
  const serverCode = await buildServerCode(serverName, serverVersion, tags);
  await writeFileWithDir(serverFilePath, serverCode);

  log.info("Generating mapper code...");
  const mapperCode = buildMapperCode();
  const mapperFilePath = path.join(srcDir, "mapper.ts");
  await writeFileWithDir(mapperFilePath, mapperCode);

  log.info("Generating package.json...");
  const packageJsonContent = buildPackageJsonCode(serverName, serverVersion);
  await writeFileWithDir(packageJsonPath, packageJsonContent);

  log.info("Generating tsconfig.json...");
  const tsconfigJsonContent = buildTypeScriptConfig();
  await writeFileWithDir(tsconfigPath, tsconfigJsonContent);

  log.info("Generating .gitignore...");
  const gitignoreContent = buildIgnorePatterns();
  await writeFileWithDir(gitignorePath, gitignoreContent);

  log.info("Generating ESLint config...");
  const eslintConfigContent = buildLinterConfig();
  await writeFileWithDir(eslintPath, eslintConfigContent);

  log.info("Generating Prettier config...");
  const prettierConfigContent = buildFormatterConfig();
  await writeFileWithDir(prettierPath, prettierConfigContent);

  log.info("Generating Jest config...");
  const jestConfigContent = buildTestConfig();
  await writeFileWithDir(jestConfigPath, jestConfigContent);

  log.info("Generating .env.example file...");
  const envExampleContent = await buildEnvExampleCode(mcp.apiGroups);
  await writeFileWithDir(envExamplePath, envExampleContent);

  log.info("Generating StreamableHTTP server files...");

  // Ensure public directory exists
  await ensureDirectoryExists(publicDir);

  // Generate a simple README file
  const readmePath = path.join(output, "README.md");
  const readmeContent = buildReadmeCode(serverName, tags, transport);
  await writeFileWithDir(readmePath, readmeContent);

  log.info(`MCP generation complete. Files written to: ${output}`);

  // Return information about the generated server
  return {
    serverName,
    serverVersion,
    outputDirectory: output,
    transportType: transport,
    port,
  };
}

export async function deleteMcpImpl(mcpId: string) {
  const implPath = await getMcpImplPath(mcpId);

  try {
    // Check if directory exists before attempting to delete
    await fs.access(implPath);
    // Directory exists, proceed with deletion
    await fs.rm(implPath, { recursive: true });
  } catch (error) {
    // If error is because directory doesn't exist, just ignore it
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error; // Re-throw if it's a different error
    }
    // Directory doesn't exist, nothing to delete
    log.info(`MCP implementation directory does not exist: ${implPath}`);
  }
}

/**
 * Get the status of an MCP server
 *
 * @param mcpId The ID of the MCP to get status for
 * @returns The current state of the MCP server or null if not found
 */
export function getMcpServerStatus(mcpId: string): McpServerState | null {
  return runningMcpServers[mcpId] || null;
}

/**
 * Get all running MCP servers
 *
 * @returns A record of all running MCP servers
 */
export function getAllMcpServerStatuses(): Record<string, McpServerState> {
  return { ...runningMcpServers };
}

// Global log storage for MCP servers
const mcpLogs: Record<
  string,
  Array<{
    timestamp: string;
    level: string;
    message: string;
    mcpId: string;
    isExternal: boolean;
  }>
> = {};

// Function to add log entry
export function addMcpLog(
  mcpId: string,
  level: string,
  message: string,
  isExternal: boolean = false,
) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, mcpId, isExternal };

  if (!mcpLogs[mcpId]) {
    mcpLogs[mcpId] = [];
  }
  mcpLogs[mcpId].push(logEntry);

  // Keep only last 1000 logs per MCP to prevent memory issues
  if (mcpLogs[mcpId].length > 1000) {
    mcpLogs[mcpId] = mcpLogs[mcpId].slice(-1000);
  }

  // Send log update to renderer if available
  try {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send("mcp-log-updated", { mcpId, logEntry });
    }
  } catch {
    // Ignore errors when sending to renderer (might not be available)
  }
}

// Function to get logs for a specific MCP
export function getMcpLogs(mcpId: string): Array<{
  timestamp: string;
  level: string;
  message: string;
  mcpId: string;
  isExternal: boolean;
}> {
  return mcpLogs[mcpId] || [];
}

// Function to clear logs for a specific MCP
export function clearMcpLogs(mcpId: string) {
  delete mcpLogs[mcpId];
}

/**
 * Start an MCP server with proper environment setup using in-memory Express server
 *
 * @param mcpId The ID of the MCP to start
 * @returns A promise that resolves with the server state when the server is started
 */
export async function startMcpServer(mcpId: string): Promise<McpServerState> {
  // Check if the server is already running
  if (runningMcpServers[mcpId]) {
    const currentState = runningMcpServers[mcpId];
    if (
      currentState.status === "running" ||
      currentState.status === "starting"
    ) {
      log.info(`MCP server ${mcpId} is already ${currentState.status}`);
      return currentState;
    }
  }

  // Initialize server state
  const serverState: McpServerState = {
    mcpId,
    status: "starting",
    isExternal: false,
    mockProcesses: {},
    startedAt: new Date(),
  };

  // Store the initial state
  runningMcpServers[mcpId] = serverState;

  try {
    const mcp = await mcpDb.getMcpById(mcpId, true);

    if (!mcp) {
      const error = `MCP with ID ${mcpId} not found`;
      addMcpLog(mcpId, "error", error);
      serverState.status = "error";
      serverState.error = error;
      return serverState;
    }

    const implPath = await getMcpImplPath(mcpId);
    addMcpLog(mcpId, "info", `Starting MCP server from: ${implPath}`);
    log.info(`Starting MCP server from: ${implPath}`);

    // Prepare environment variables for the MCP server
    const env: Record<string, string> = {
      ...(getDefaultEnvironment() as Record<string, string>),
    };

    // Process each API group
    for (const [apiId, apiGroup] of Object.entries(mcp.apiGroups)) {
      // Set base URL environment variable
      const baseUrlEnvVar = buildVariableName(apiGroup.name, "BASE_URL");

      // Check if this API should be mocked
      if (apiGroup.useMockData && apiGroup.tools && apiGroup.tools.length > 0) {
        addMcpLog(mcpId, "info", `Mocking API: ${apiGroup.name}`);
        log.info(`Mocking API: ${apiGroup.name}`);
        // Start the mock server and get the URL
        const mockResult = await mockApi(apiId);
        // Store the mock result for cleanup later
        serverState.mockProcesses[apiId] = mockResult;
        env[baseUrlEnvVar] = mockResult.url;
      } else if (apiGroup.serverUrl) {
        // Use the provided server URL
        env[baseUrlEnvVar] = apiGroup.serverUrl;
      }

      // Set security-related environment variables
      if (apiGroup.auth) {
        const auth = apiGroup.auth;

        if (auth.type === "apiKey" && auth.key) {
          const keyEnvVar = buildVariableName(apiGroup.name, "API_KEY");
          env[keyEnvVar] = auth.key;
        } else if (auth.type === "bearerToken" && auth.token) {
          const tokenEnvVar = buildVariableName(apiGroup.name, "BEARER_TOKEN");
          env[tokenEnvVar] = auth.token;
        }
      }
    }

    const port = await findFreePort();

    // Load tools from the generated tools directory
    const toolsDir = await getMcpImplToolsDir(mcpId);
    const tools = await loadToolsFromDirectory(toolsDir);

    addMcpLog(mcpId, "info", `Loaded ${tools.size} tools from ${toolsDir}`);
    log.info(`Loaded ${tools.size} tools from ${toolsDir}`);

    const mcpServer = createMcpServer(mcpId, tools, env);

    // Create Express server
    const expressApp = setupStreamableExpressServer(mcpServer);

    // Start the server and wait for it to be ready
    await new Promise<void>((resolve, reject) => {
      const server = expressApp.listen(port, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        addMcpLog(mcpId, "info", `MCP server ${mcpId} started on port ${port}`);
        log.info(`MCP server ${mcpId} started on port ${port}`);
        serverState.status = "running";
        serverState.port = port;
        serverState.url = `http://localhost:${port}/mcp`;

        // Store server reference for cleanup
        serverState.expressServer = server;

        addMcpLog(
          mcpId,
          "info",
          `MCP server ${mcpId} started with status: ${serverState.status}`,
        );
        log.info(
          `MCP server ${mcpId} started with status: ${serverState.status}`,
        );

        resolve();
      });

      // Handle server errors
      server.on("error", (error: unknown) => {
        const errorMessage = String(error);
        addMcpLog(mcpId, "error", `MCP server ${mcpId} error: ${errorMessage}`);
        log.error(`MCP server ${mcpId} error:`, error);
        serverState.status = "error";
        serverState.error = errorMessage;
        reject(error);
      });
    });

    const transportConfig = {
      type: "http" as const,
      url: `http://localhost:${port}/mcp`,
    };
    serverState.transport = transportConfig;

    const client = new Client({
      name: "Summon",
      version: "1.0.0",
    });
    serverState.client = client;

    const transport = new StreamableHTTPClientTransport(
      new URL(transportConfig.url),
    );

    // Hook into transport events for detailed logging
    transport.onmessage = (message) => {
      const stringifiedMessage = JSON.stringify(message);
      if (stringifiedMessage.includes(`"result":{}`)) return;
      addMcpLog(mcpId, "debug", `← Received: ${stringifiedMessage}`);
    };

    transport.onerror = (error) => {
      addMcpLog(mcpId, "error", `Transport error: ${error.message}`);
    };

    transport.onclose = () => {
      addMcpLog(mcpId, "info", `Transport connection closed`);
    };

    await client.connect(transport);

    return serverState;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    addMcpLog(
      mcpId,
      "error",
      `Error starting MCP server ${mcpId}: ${errorMessage}`,
    );
    log.error(`Error starting MCP server ${mcpId}:`, errorMessage);
    serverState.status = "error";
    serverState.error = errorMessage;
    return serverState;
  }
}

/**
 * Stop an MCP server and all its associated mock processes
 *
 * @param mcpId The ID of the MCP to stop
 * @returns A promise that resolves with the server state when the server is stopped
 */
export async function stopMcpServer(
  mcpId: string,
  remove?: boolean,
): Promise<McpServerState | null> {
  // Check if the server is running
  if (!runningMcpServers[mcpId]) {
    log.info(`MCP server ${mcpId} is not running`);
    return null;
  }

  const serverState = runningMcpServers[mcpId];

  // Stop all mock processes
  for (const apiId in serverState.mockProcesses) {
    try {
      const mockResult = serverState.mockProcesses[apiId];
      if (mockResult.server) {
        log.info(`Stopping mock server for API ${apiId}`);
        await mockResult.server.stop();
      }
    } catch (error) {
      log.error(`Error stopping mock server for API ${apiId}:`, error);
    }
  }

  // Stop the server process
  if (serverState.expressServer) {
    log.info(`Stopping MCP server ${mcpId}`);
    serverState.expressServer.close();

    // Wait for the process to terminate
    await new Promise<void>((resolve) => {
      if (!serverState.expressServer) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        log.warn(
          `Timeout waiting for MCP server ${mcpId} to stop, forcing termination`,
        );
        if (serverState.expressServer) {
          serverState.expressServer.close();
        }
        resolve();
      }, 5000);

      serverState.expressServer.on("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  // Update state
  serverState.status = "stopped";
  serverState.stoppedAt = new Date();

  log.info(`MCP server ${mcpId} stopped`);

  if (remove) {
    delete runningMcpServers[mcpId];
  }
  return serverState;
}

/**
 * Restart an MCP server
 *
 * @param mcpId The ID of the MCP to restart
 * @returns A promise that resolves with the new server state
 */
export async function restartMcpServer(mcpId: string): Promise<McpServerState> {
  log.info(`Restarting MCP server ${mcpId}`);

  // Stop the server if it's running
  await stopMcpServer(mcpId);

  // Start the server again
  return startMcpServer(mcpId);
}

/**
 * Creates a zip file of the MCP implementation folder and saves it to the downloads directory
 *
 * @param mcpId The ID of the MCP to download
 * @returns Promise with success status and file path or error message
 */
export async function downloadMcpZip(
  mcpId: string,
): Promise<{ success: boolean; filePath?: string; message?: string }> {
  try {
    const mcpData = await mcpDb.getMcpById(mcpId);
    if (!mcpData) {
      return { success: false, message: "MCP not found" };
    }

    const implPath = await getMcpImplPath(mcpId);

    // Check if the implementation folder exists
    try {
      await fs.access(implPath);
    } catch {
      return { success: false, message: "MCP implementation folder not found" };
    }

    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(app.getPath("userData"), "downloads");
    try {
      await fs.access(downloadsDir);
    } catch {
      await fs.mkdir(downloadsDir, { recursive: true });
    }

    // Create zip file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const zipFileName = `${mcpData.name}-${timestamp}.zip`;
    const zipFilePath = path.join(downloadsDir, zipFileName);

    return new Promise((resolve) => {
      const output = createWriteStream(zipFilePath);
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      output.on("close", () => {
        resolve({
          success: true,
          filePath: zipFilePath,
          message: `MCP implementation zipped successfully (${archive.pointer()} bytes)`,
        });
      });

      archive.on("error", (err: Error) => {
        resolve({
          success: false,
          message: `Error creating zip: ${err.message}`,
        });
      });

      archive.pipe(output);

      // Add files to archive, excluding node_modules and other unnecessary files
      archive.glob("**/*", {
        cwd: implPath,
        dot: true, // Include dotfiles (files starting with .)
        ignore: [
          "node_modules/**",
          ".git/**",
          ".DS_Store",
          "*.log",
          ".env",
          ".env.local",
          ".env.development",
          ".env.production",
          ".env.test",
          "dist/**",
          "build/**",
          ".cache/**",
          "coverage/**",
          ".nyc_output/**",
          "*.tgz",
          "*.tar.gz",
        ],
      });

      archive.finalize();
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Opens the folder containing the specified file and highlights it
 *
 * @param filePath The path to the file to show
 */
export function showFileInFolder(filePath: string): void {
  shell.showItemInFolder(filePath);
}

/**
 * Stop all running MCP servers (both internal and external)
 *
 * @param options Configuration options for stopping servers
 * @returns Promise that resolves when all servers are stopped
 */
export async function stopAllMcpServers(
  options: {
    /** Whether to stop servers in parallel (faster) or sequential (more controlled) */
    parallel?: boolean;
    /** Whether to remove servers from the running state after stopping */
    removeFromState?: boolean;
  } = {},
): Promise<void> {
  const serverIds = Object.keys(runningMcpServers);

  if (serverIds.length === 0) {
    log.info("No MCP servers to stop");
    return;
  }

  const { parallel = true, removeFromState = false } = options;

  const stopServer = async (serverId: string) => {
    try {
      log.info(`Stopping MCP server: ${serverId}`);
      // Also stop external MCP servers
      const serverState = runningMcpServers[serverId];
      if (serverState?.isExternal) {
        await stopExternalMcp(serverId, removeFromState);
      } else {
        await stopMcpServer(serverId, removeFromState);
      }
      log.info(`Successfully stopped MCP server: ${serverId}`);
    } catch (error) {
      log.error(`Error stopping MCP server ${serverId}:`, error);
    }
  };

  log.info(
    `Stopping ${serverIds.length} MCP servers in ${parallel ? "parallel" : "sequential"} mode`,
  );

  if (parallel) {
    await Promise.all(serverIds.map(stopServer));
  } else {
    for (const serverId of serverIds) {
      await stopServer(serverId);
    }
  }

  log.info("All MCP servers have been stopped");
}

/**
 * Generate fake data from a JSON Schema using JSONSchemaFaker
 *
 * @param schema The JSON Schema to generate fake data from
 * @returns A promise that resolves with the generated fake data
 */
export function generateFakeData(schema: unknown) {
  return JSONSchemaFaker.generate(schema as JSONSchema7);
}
