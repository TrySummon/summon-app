import { toHyphenCase } from "@/lib/string";

function buildArgumentParser(categories: string[]) {
  const hyphenCategories = categories.map(toHyphenCase);

  return `export function extractArguments(args: string[]) {
  const selections: { [key: string]: string } = {};
  const validCategories = ${JSON.stringify(hyphenCategories)};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      if (key == 'tools') {
        const toolSpecs = value.split(',');
        for (const spec of toolSpecs) {
          const specParts = spec.split('.');
          const category = specParts[0];
          const permission = specParts.length > 1 ? specParts[1] : 'all';
          ${
            categories.length
              ? `if (!validCategories.includes(category.trim())) {
            throw new Error(
              \`Invalid category: \${spec}. Valid categories: \${validCategories.join(", ")}\`
            );
          }`
              : ""
          }
          if (!['all', 'create', 'read', 'update', 'delete'].includes(permission.trim())) {
            throw new Error(
              \`Invalid permission: \${permission}. Valid permissions: all, create, read, update, delete\`
            );
          }
          selections[category.trim()] = permission.trim();
        }
      }
    }
  });
  
  return selections;
}
`;
}

/**
 * Creates tool list handler implementation
 *
 * @returns Generated handler code
 */
function buildToolListHandler(): string {
  return `mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolRegistry.values()).map(def => {
    const prefix = def.prefix || "";

    // Use optimised version if available, otherwise fall back to original
    if (def.optimised) {
      return {
        name: prefix + def.optimised.name,
        description: def.optimised.description,
        inputSchema: def.optimised.inputSchema
      };
    }
    
    return {
      name: prefix + def.name,
      description: def.description,
      inputSchema: def.inputSchema
    };
  });
  return { tools: toolsForClient };
});`;
}

/**
 * Creates tool execution handler
 *
 * @returns Generated handler code
 */
function buildToolExecutorHandler(): string {
  return `mcpServer.setRequestHandler(
  CallToolRequestSchema,
  async (request, extra): Promise<CallToolResult> => {
    const { name: requestedTool, arguments: toolParams } = request.params;
    const toolConfig = toolRegistry.get(requestedTool);
    if (!toolConfig) {
      console.error(\`Error: Unknown tool: \${requestedTool}\`);
      return { content: [{ type: 'text', text: \`Error: Unknown tool: \${requestedTool}\` }] };
    }
    return await executeTool(requestedTool, toolConfig, extra, toolParams ?? {});
  }
);`;
}

export async function buildServerCode(
  serviceName: string,
  serviceVersion: string,
  categories: string[],
  servicePort = 3000,
): Promise<string> {
  // Build argument parser
  const argumentParserCode = buildArgumentParser(categories);
  // Build handlers
  const toolExecutorHandlerCode = buildToolExecutorHandler();
  const toolListHandlerCode = buildToolListHandler();

  const transportImportStatement = `\nimport { initializeStreamAdapter } from "./adapter.js";`;
  const transportSetupCode = `// Initialize Stream adapter
try {
  await initializeStreamAdapter(mcpServer, servicePort);
} catch (err) {
  console.error("Failed to initialize Stream adapter:", err);
  process.exit(1);
}`;

  // Build complete server
  const serverCode = `#!/usr/bin/env node
/**
 * Protocol Server for ${serviceName} v${serviceVersion}
 * Created: ${new Date().toISOString()}
 */

// Load environment configuration
import dotenv from 'dotenv';
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';${transportImportStatement}
import { loadTools, executeTool } from "./tools/index.js";


/**
 * Service configuration
 */
export const SERVICE_NAME = "${serviceName}";
export const SERVICE_VERSION = "${serviceVersion}";


/**
 * Parse command arguments
 */
${argumentParserCode}
const allowedTools = extractArguments(process.argv.slice(2));


const toolRegistry = loadTools(allowedTools);

const mcpServer = new Server(
    { name: SERVICE_NAME, version: SERVICE_VERSION },
    { capabilities: { tools: {} } }
);
const servicePort = Number(process.env.PORT) || ${servicePort};

${toolListHandlerCode}
${toolExecutorHandlerCode}

/**
 * Initialize service
 */
async function initialize() {
${transportSetupCode}
}

/**
 * Shutdown handler
 */
async function shutdown() {
    console.error("Terminating Protocol Server...");
    process.exit(0);
}

// Register handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Launch server
initialize().catch((err) => {
  console.error("Critical error during initialization:", err);
  process.exit(1);
});`;

  return serverCode;
}
