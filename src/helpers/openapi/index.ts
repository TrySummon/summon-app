import fs from "fs/promises";
import path from "path";

import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPIV3 } from "openapi-types";

import logger from "@/lib/logger";

import {
  generateEnvExample,
  generateEslintConfig,
  generateGitignore,
  generateJestConfig,
  generateMcpServerCode,
  generateOAuth2Docs,
  generatePackageJson,
  generatePrettierConfig,
  generateReadme,
  generateStreamableHttpClientHtml,
  generateStreamableHttpCode,
  generateTestClientHtml,
  generateTsconfigJson,
  generateWebServerCode,
} from "./generator";
import { McpOptions } from "./types";
import { kebabCase } from "./utils";

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
async function writeFileWithDirs(
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
export async function generateMcp(options: McpOptions) {
  const { input, output } = options;

  // Parse and dereference the OpenAPI specification
  let api: OpenAPIV3.Document;

  if (typeof input === "string") {
    // If input is a string (file path), dereference it
    api = (await SwaggerParser.dereference(input)) as OpenAPIV3.Document;
  } else {
    // If input is already an OpenAPI document (used when passing merged specs)
    api = input as OpenAPIV3.Document;
  }

  // Determine server name and version
  const serverNameRaw =
    options.serverName || api.info?.title || "my-mcp-server";
  const serverName = serverNameRaw.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const serverVersion = options.serverVersion || api.info?.version || "0.1.0";

  // Define file paths
  const srcDir = path.join(output, "src");
  const serverFilePath = path.join(srcDir, "index.ts");
  const packageJsonPath = path.join(output, "package.json");
  const tsconfigPath = path.join(output, "tsconfig.json");
  const gitignorePath = path.join(output, ".gitignore");
  const eslintPath = path.join(output, ".eslintrc.json");
  const prettierPath = path.join(output, ".prettierrc");
  const jestConfigPath = path.join(output, "jest.config.js");
  const envExamplePath = path.join(output, ".env.example");
  const docsDir = path.join(output, "docs");
  const oauth2DocsPath = path.join(docsDir, "oauth2-configuration.md");

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
  logger.info("Generating server code...");
  const serverTsContent = generateMcpServerCode(
    api,
    options,
    serverName,
    serverVersion
  );
  await writeFileWithDirs(serverFilePath, serverTsContent);

  logger.info("Generating package.json...");
  const packageJsonContent = generatePackageJson(
    serverName,
    serverVersion,
    options.transport
  );
  await writeFileWithDirs(packageJsonPath, packageJsonContent);

  logger.info("Generating tsconfig.json...");
  const tsconfigJsonContent = generateTsconfigJson();
  await writeFileWithDirs(tsconfigPath, tsconfigJsonContent);

  logger.info("Generating .gitignore...");
  const gitignoreContent = generateGitignore();
  await writeFileWithDirs(gitignorePath, gitignoreContent);

  logger.info("Generating ESLint config...");
  const eslintConfigContent = generateEslintConfig();
  await writeFileWithDirs(eslintPath, eslintConfigContent);

  logger.info("Generating Prettier config...");
  const prettierConfigContent = generatePrettierConfig();
  await writeFileWithDirs(prettierPath, prettierConfigContent);

  logger.info("Generating Jest config...");
  const jestConfigContent = generateJestConfig();
  await writeFileWithDirs(jestConfigPath, jestConfigContent);

  logger.info("Generating .env.example file...");
  const envExampleContent = generateEnvExample(api.components?.securitySchemes);
  await writeFileWithDirs(envExamplePath, envExampleContent);

  logger.info("Generating OAuth2 documentation...");
  const oauth2DocsContent = generateOAuth2Docs(api.components?.securitySchemes);
  await writeFileWithDirs(oauth2DocsPath, oauth2DocsContent);

  // Generate web server files if web transport is requested
  if (options.transport === "web") {
    logger.info("Generating web server files...");

    // Ensure public directory exists
    await ensureDirectoryExists(publicDir);

    // Generate web server code
    const webServerCode = generateWebServerCode(options.port || 3000);
    await writeFileWithDirs(webServerPath, webServerCode);

    // Generate test client
    const indexHtmlContent = generateTestClientHtml(serverName);
    await writeFileWithDirs(indexHtmlPath, indexHtmlContent);
  }

  // Generate streamable HTTP files if streamable-http transport is requested
  if (options.transport === "streamable-http") {
    logger.info("Generating StreamableHTTP server files...");

    // Ensure public directory exists
    await ensureDirectoryExists(publicDir);

    // Generate StreamableHTTP server code
    const streamableHttpCode = generateStreamableHttpCode(options.port || 3000);
    await writeFileWithDirs(streamableHttpPath, streamableHttpCode);

    // Generate test client
    const indexHtmlContent = generateStreamableHttpClientHtml(serverName);
    await writeFileWithDirs(indexHtmlPath, indexHtmlContent);
  }

  // Generate a simple README file
  const readmePath = path.join(output, "README.md");
  const tags = api.tags?.map((tag) => kebabCase(tag.name)) || [];
  const readmeContent = generateReadme(serverName, tags, options);
  await writeFileWithDirs(readmePath, readmeContent);

  logger.info(`MCP generation complete. Files written to: ${output}`);

  // Return information about the generated server
  return {
    serverName,
    serverVersion,
    outputDirectory: output,
    transportType: options.transport,
    port: options.port || 3000,
  };
}
