import fs from "fs/promises";
import path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";

import {
  generateEnvExample,
  generateEslintConfig,
  generateGitignore,
  generateJestConfig,
  generateMcpServerCode,
  generateMcpTools,
  generatePackageJson,
  generatePrettierConfig,
  generateReadme,
  generateStreamableHttpClientHtml,
  generateStreamableHttpCode,
  generateTestClientHtml,
  generateTsconfigJson,
  generateWebServerCode,
} from "./generator";
import { getMcpImplPath, mcpDb } from "../db/mcp-db";
import { console } from "inspector/promises";
import { mockApi } from "../mock";
import { apiKeyEnvVarName, baseUrlEnvVarName, bearerTokenEnvVarName } from "./generator/utils";
import { findFreePort } from "../port";
import { McpServerState, runningMcpServers } from "./state";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";


/**
 * Creates a directory if it doesn't exist
 *
 * @param dir Directory path to create
 */
async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Writes content to a file, creating parent directories if needed
 *
 * @param filePath Path where the file should be written
 * @param content Content to write to the file
 */
async function writeFileWithDir(
  filePath: string,
  content: string
): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDirectoryExists(dir);
  await fs.writeFile(filePath, content, "utf8");
}

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

  const output = getMcpImplPath(mcp.id);

  // Determine server name and version
  const serverName = mcp.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const serverVersion = "1.0.0";
  const transport: string = "streamable-http";
  const port = 3000;

  // Define file paths
  const srcDir = path.join(output, "src");
  const toolsDir = path.join(srcDir, "tools");
  const serverFilePath = path.join(srcDir, "index.ts");
  const packageJsonPath = path.join(output, "package.json");
  const tsconfigPath = path.join(output, "tsconfig.json");
  const gitignorePath = path.join(output, ".gitignore");
  const eslintPath = path.join(output, ".eslintrc.json");
  const prettierPath = path.join(output, ".prettierrc");
  const jestConfigPath = path.join(output, "jest.config.js");
  const envExamplePath = path.join(output, ".env.example");
  const docsDir = path.join(output, "docs");

  // Web server files (if requested)
  const webServerPath = path.join(srcDir, "web-server.ts");
  const publicDir = path.join(output, "public");
  const indexHtmlPath = path.join(publicDir, "index.html");

  // StreamableHTTP files (if requested)
  const streamableHttpPath = path.join(srcDir, "streamable-http.ts");

  // Ensure the main directories exist
  await ensureDirectoryExists(srcDir);
  await ensureDirectoryExists(docsDir);

  // Generate and write core files
  console.info("Generating tools code...");
  const tools = await generateMcpTools(mcp.apiGroups);
  
  const tags = tools.map((tool) => tool.tags).flat().filter((tag, index, self) => self.indexOf(tag) === index);

  await Promise.all(tools.map(tool => {
    const toolFilePath = path.join(toolsDir, `${tool.name}.json`);
    const toolContent = JSON.stringify(tool, null, 2);
    return writeFileWithDir(toolFilePath, toolContent);
  }));

  console.info("Generating server code...");
  const serverTsContent = await generateMcpServerCode(
    serverName,
    serverVersion,
    tags,
  );
  await writeFileWithDir(serverFilePath, serverTsContent);

  console.info("Generating package.json...");
  const packageJsonContent = generatePackageJson(
    serverName,
    serverVersion,
    transport
  );
  await writeFileWithDir(packageJsonPath, packageJsonContent);

  console.info("Generating tsconfig.json...");
  const tsconfigJsonContent = generateTsconfigJson();
  await writeFileWithDir(tsconfigPath, tsconfigJsonContent);

  console.info("Generating .gitignore...");
  const gitignoreContent = generateGitignore();
  await writeFileWithDir(gitignorePath, gitignoreContent);

  console.info("Generating ESLint config...");
  const eslintConfigContent = generateEslintConfig();
  await writeFileWithDir(eslintPath, eslintConfigContent);

  console.info("Generating Prettier config...");
  const prettierConfigContent = generatePrettierConfig();
  await writeFileWithDir(prettierPath, prettierConfigContent);

  console.info("Generating Jest config...");
  const jestConfigContent = generateJestConfig();
  await writeFileWithDir(jestConfigPath, jestConfigContent);

  console.info("Generating .env.example file...");
  const envExampleContent = generateEnvExample(mcp.apiGroups);
  await writeFileWithDir(envExamplePath, envExampleContent);

  // Generate web server files if web transport is requested
  if (transport === "web") {
    console.info("Generating web server files...");

    // Ensure public directory exists
    await ensureDirectoryExists(publicDir);

    // Generate web server code
    const webServerCode = generateWebServerCode();
    await writeFileWithDir(webServerPath, webServerCode);

    // Generate test client
    const indexHtmlContent = generateTestClientHtml(serverName);
    await writeFileWithDir(indexHtmlPath, indexHtmlContent);
  }

  // Generate streamable HTTP files if streamable-http transport is requested
  if (transport === "streamable-http") {
    console.info("Generating StreamableHTTP server files...");

    // Ensure public directory exists
    await ensureDirectoryExists(publicDir);

    // Generate StreamableHTTP server code
    const streamableHttpCode = generateStreamableHttpCode();
    await writeFileWithDir(streamableHttpPath, streamableHttpCode);

    // Generate test client
    const indexHtmlContent = generateStreamableHttpClientHtml(serverName);
    await writeFileWithDir(indexHtmlPath, indexHtmlContent);
  }

  // Generate a simple README file
  const readmePath = path.join(output, "README.md");
  const readmeContent = generateReadme(serverName, tags, transport);
  await writeFileWithDir(readmePath, readmeContent);

  console.info(`MCP generation complete. Files written to: ${output}`);

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
  const implPath = getMcpImplPath(mcpId);

  try {
    // Check if directory exists before attempting to delete
    await fs.access(implPath);
    // Directory exists, proceed with deletion
    await fs.rm(implPath, { recursive: true });
  } catch (error) {
    // If error is because directory doesn't exist, just ignore it
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error; // Re-throw if it's a different error
    }
    // Directory doesn't exist, nothing to delete
    console.info(`MCP implementation directory does not exist: ${implPath}`);
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

/**
 * Start an MCP server with proper environment setup
 * 
 * @param mcpId The ID of the MCP to start
 * @returns A promise that resolves with the server state when the server is started
 */
export async function startMcpServer(mcpId: string): Promise<McpServerState> {
  // Check if the server is already running
  if (runningMcpServers[mcpId]) {
    const currentState = runningMcpServers[mcpId];
    if (currentState.status === 'running' || currentState.status === 'starting') {
      console.info(`MCP server ${mcpId} is already ${currentState.status}`);
      return currentState;
    }
  }
  // Initialize server state
  const serverState: McpServerState = {
    mcpId,
    status: 'starting',
    mockProcesses: {},
    startedAt: new Date()
  };
  
  // Store the initial state
  runningMcpServers[mcpId] = serverState;

  try {
    const execPromise = promisify(exec);
    const mcp = await mcpDb.getMcpById(mcpId, true);

    if (!mcp) {
      const error = `MCP with ID ${mcpId} not found`;
      serverState.status = 'error';
      serverState.error = error;
      return serverState;
    }

    const implPath = getMcpImplPath(mcpId);
    console.info(`Starting MCP server from: ${implPath}`);

    // Prepare environment variables for the MCP server
    const env: Record<string, string> = { ...process.env as Record<string, string> };

    // Process each API group
    for (const apiGroup of Object.values(mcp.apiGroups)) {
      // Set base URL environment variable
      const baseUrlEnvVar = baseUrlEnvVarName(apiGroup.name);
      
      // Check if this API should be mocked
      if (apiGroup.useMockData && apiGroup.endpoints && apiGroup.endpoints.length > 0) {
        // Get the API ID from the first endpoint
        const apiId = apiGroup.endpoints[0].apiId;
        console.info(`Mocking API: ${apiGroup.name}`);
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
        
        if (auth.type === 'apiKey' && auth.key) {
          const keyEnvVar = apiKeyEnvVarName(apiGroup.name);
          env[keyEnvVar] = auth.key;
        } else if (auth.type === 'bearer' && auth.token) {
          const tokenEnvVar = bearerTokenEnvVarName(apiGroup.name);
          env[tokenEnvVar] = auth.token;
        }
      }
    }
    
    const port = (await findFreePort());
    env.PORT = port.toString();

    // Check if node_modules exists, if not run npm install
    try {
      await fs.access(path.join(implPath, 'node_modules'));
      console.info('node_modules directory exists, skipping npm install');
    } catch (error) {
      console.info('node_modules directory not found, running npm install...');
      try {
        const { stdout, stderr } = await execPromise('npm install', { cwd: implPath });
        console.info('npm install completed successfully');
        console.info(stdout);
        if (stderr) console.error(stderr);
      } catch (error) {
        const installError = error as Error;
        console.error('Error during npm install:', installError);
        serverState.status = 'error';
        serverState.error = `npm install failed: ${installError.message || String(installError)}`;
        return serverState;
      }
    }

    // Start the MCP server with the prepared environment variables
    console.info('Starting MCP server with npm start...');
    
    const npmStart = spawn('npm', ['start'], {
      cwd: implPath,
      env,
      stdio: 'inherit'
    });
    
    // Update server state with process information
    serverState.serverProcess = npmStart;
    
    // Handle process events
    npmStart.on('error', (error) => {
      console.error('Error starting MCP server:', error);
      serverState.status = 'error';
      serverState.error = `Server process error: ${error.message}`;
    });
    
    npmStart.on('close', (code) => {
      if (code !== 0) {
        console.error(`MCP server process exited with code ${code}`);
        serverState.status = 'error';
        serverState.error = `Server process exited with code ${code}`;
      } else {
        console.info('MCP server process completed successfully');
        serverState.status = 'stopped';
      }
      serverState.stoppedAt = new Date();
    });
    
    // Wait a moment to ensure the server has time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // If no errors occurred during startup, mark as running
    if (serverState.status === 'starting') {
      serverState.status = 'running';
    }

    const transport = { type: 'http' as const, url: `http://localhost:${port}/mcp` };
    serverState.transport = transport;

    const client = new Client({
      name: "toolman",
      version: "1.0.0"
    });
    serverState.client = client;
    await client.connect(new StreamableHTTPClientTransport(
      new URL(transport.url)
    ));
    
    console.info(`MCP server ${mcpId} started with status: ${serverState.status}`);
    return serverState;
  } catch (error) {
    // Handle any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error starting MCP server ${mcpId}:`, errorMessage);
    serverState.status = 'error';
    serverState.error = `Unexpected error: ${errorMessage}`;
    return serverState;
  }
}

/**
 * Stop an MCP server and all its associated mock processes
 * 
 * @param mcpId The ID of the MCP to stop
 * @returns A promise that resolves with the server state when the server is stopped
 */
export async function stopMcpServer(mcpId: string): Promise<McpServerState | null> {
  // Check if the server is running
  if (!runningMcpServers[mcpId]) {
    console.info(`MCP server ${mcpId} is not running`);
    return null;
  }
  
  const serverState = runningMcpServers[mcpId];
  
  // Stop all mock processes
  for (const apiId in serverState.mockProcesses) {
    try {
      const mockProcess = serverState.mockProcesses[apiId].process;
      if (mockProcess && mockProcess.listening) {
        console.info(`Stopping mock process for API ${apiId}`);
        mockProcess.close();
      }
    } catch (error) {
      console.error(`Error stopping mock process for API ${apiId}:`, error);
    }
  }
  
  // Stop the server process
  if (serverState.serverProcess && !serverState.serverProcess.killed) {
    console.info(`Stopping MCP server ${mcpId}`);
    serverState.serverProcess.kill();
    
    // Wait for the process to terminate
    await new Promise<void>((resolve) => {
      if (!serverState.serverProcess) {
        resolve();
        return;
      }
      
      const timeout = setTimeout(() => {
        console.warn(`Timeout waiting for MCP server ${mcpId} to stop, forcing termination`);
        if (serverState.serverProcess && !serverState.serverProcess.killed) {
          serverState.serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
      
      serverState.serverProcess.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  if (serverState.client) {
    await serverState.client.close();
  }
  
  // Update state
  serverState.status = 'stopped';
  serverState.stoppedAt = new Date();
  
  console.info(`MCP server ${mcpId} stopped`);
  return serverState;
}

/**
 * Restart an MCP server
 * 
 * @param mcpId The ID of the MCP to restart
 * @returns A promise that resolves with the new server state
 */
export async function restartMcpServer(mcpId: string): Promise<McpServerState> {
  console.info(`Restarting MCP server ${mcpId}`);
  
  // Stop the server if it's running
  await stopMcpServer(mcpId);
  
  // Start the server again
  return startMcpServer(mcpId);
}