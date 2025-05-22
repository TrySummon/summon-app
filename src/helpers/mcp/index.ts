import fs from "fs/promises";
import path from "path";

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
  const tools = generateMcpTools(mcp.apiGroups);
  
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
    const webServerCode = generateWebServerCode(port);
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
    const streamableHttpCode = generateStreamableHttpCode(port);
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
  