/**
 * Code generation utilities for OpenAPI to MCP generator
 */
import { OpenAPIV3 } from "openapi-types";

import logger from "@/lib/logger";

import { McpToolDefinition } from "../types/index";
import { sanitizeForTemplate } from "./helpers";

/**
 * Generates the tool definition map code
 *
 * @param tools List of tool definitions
 * @param securitySchemes Security schemes from OpenAPI spec
 * @returns Generated code for the tool definition map
 */
export function generateToolDefinitionMap(
  tools: McpToolDefinition[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  securitySchemes?: OpenAPIV3.ComponentsObject["securitySchemes"]
): string {
  if (tools.length === 0) return "";

  return tools
    .map((tool) => {
      // Safely stringify complex objects
      let schemaString;
      try {
        schemaString = JSON.stringify(tool.inputSchema);
      } catch (e) {
        schemaString = "{}";
        logger.warn(`Failed to stringify schema for tool ${tool.name}: ${e}`);
      }

      let execParamsString;
      try {
        execParamsString = JSON.stringify(tool.executionParameters);
      } catch (e) {
        execParamsString = "[]";
        logger.warn(
          `Failed to stringify execution parameters for tool ${tool.name}: ${e}`
        );
      }

      let securityReqsString;
      try {
        securityReqsString = JSON.stringify(tool.securityRequirements);
      } catch (e) {
        securityReqsString = "[]";
        logger.warn(
          `Failed to stringify security requirements for tool ${tool.name}: ${e}`
        );
      }

      // Sanitize description for template literal
      const escapedDescription = sanitizeForTemplate(tool.description);

      // Build the tool definition entry
      return `
  ["${tool.name}", {
    name: "${tool.name}",
    description: \`${escapedDescription}\`,
    tags: ${JSON.stringify(tool.tags)},
    inputSchema: ${schemaString},
    method: "${tool.method}",
    pathTemplate: "${tool.pathTemplate}",
    executionParameters: ${execParamsString},
    requestBodyContentType: ${tool.requestBodyContentType ? `"${tool.requestBodyContentType}"` : "undefined"},
    securityRequirements: ${securityReqsString}
  }],`;
    })
    .join("");
}

/**
 * Generates the list tools handler code
 *
 * @returns Generated code for the list tools handler
 */
export function generateListToolsHandler(): string {
  return `
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(filteredToolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});
`;
}

/**
 * Generates the call tool handler code
 *
 * @returns Generated code for the call tool handler
 */
export function generateCallToolHandler(): string {
  return `
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = filteredToolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(\`Error: Unknown tool requested: \${toolName}\`);
    return { content: [{ type: "text", text: \`Error: Unknown tool requested: \${toolName}\` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});
`;
}

/**
 * Convert a string to title case
 *
 * @param str String to convert
 * @returns Title case string
 */
export function titleCase(str: string): string {
  // Converts snake_case, kebab-case, or path/parts to TitleCase
  return str
    .toLowerCase()
    .replace(/[-_/](.)/g, (_, char) => char.toUpperCase()) // Handle separators
    .replace(/^{/, "") // Remove leading { from path params
    .replace(/}$/, "") // Remove trailing } from path params
    .replace(/^./, (char) => char.toUpperCase()); // Capitalize first letter
}

/**
 * Converts a string to kebab-case.
 * - Handles camelCase, PascalCase, snake_case, and space-separated strings
 * - Converts all characters to lowercase
 * - Replaces spaces, underscores, and case boundaries with hyphens
 * - Removes consecutive hyphens and trims hyphens from start/end
 *
 * @param str - The input string to convert
 * @returns The kebab-cased string
 */
export function kebabCase(str: string): string {
  if (!str) return "";

  // Handle camelCase and PascalCase by adding a space before uppercase letters
  const withSpaces = str.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  // Replace spaces and underscores with hyphens, convert to lowercase
  return withSpaces
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, ""); // Remove hyphens from start and end
}

/**
 * Generates an operation ID from method and path
 *
 * @param method HTTP method
 * @param path API path
 * @returns Generated operation ID
 */
export function generateOperationId(method: string, path: string): string {
  // Generator: get /users/{userId}/posts -> GetUsersPostsByUserId
  const parts = path.split("/").filter((p) => p); // Split and remove empty parts

  let name = method.toLowerCase(); // Start with method name

  parts.forEach((part, index) => {
    if (part.startsWith("{") && part.endsWith("}")) {
      // Append 'By' + ParamName only for the *last* path parameter segment
      if (index === parts.length - 1) {
        name += "By" + titleCase(part);
      }
      // Potentially include non-terminal params differently if needed, e.g.:
      // else { name += 'With' + titleCase(part); }
    } else {
      // Append the static path part in TitleCase
      name += titleCase(part);
    }
  });

  // Simple fallback if name is just the method (e.g., GET /)
  if (name === method.toLowerCase()) {
    name += "Root";
  }

  // Ensure first letter is uppercase after potential lowercase method start
  name = name.charAt(0).toUpperCase() + name.slice(1);

  return name;
}

export function generateParseToolArgsFunction(tags: string[]) {
  const kebabCaseTags = tags.map(kebabCase);

  return `
export function parseToolArgs(args: string[]) {
  const options: { [key: string]: string } = {};

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      if (key == 'tools') {
        const tools = value.split(',');
        for (const tool of tools) {
          const toolsParts = tool.split('.');
          const toolName = toolsParts[0];
          const toolPermission = toolsParts.length > 1 ? toolsParts[1] : 'all';
          if (!${JSON.stringify(kebabCaseTags)}.includes(toolName.trim())) {
            throw new Error(
              \`Invalid tool scope: \${tool}. Accepted tool scopes are: \${${JSON.stringify(kebabCaseTags)}.join(", ")}\`
            );
          }
          if (!['all', 'create', 'read', 'update', 'delete'].includes(toolPermission.trim())) {
            throw new Error(
              \`Invalid tool action: \${toolPermission}. Accepted actions are: all, create, read, update, delete\`
            );
          }
          options[toolName.trim()] = toolPermission.trim();
        }
      }
    }
  });
  
  return options;
}
`;
}

export function generateFilterToolDefinitionMapFunction(): string {
  return `
// CRUD to HTTP method mapping
const crudToHttpMethod = {
  create: ['post'],
  read: ['get'],
  update: ['put', 'patch'], // Handle both PUT and PATCH as update
  delete: ['delete'],
};

export function filterToolDefinitionMap(toolDefinitionMap: Map<string, McpToolDefinition>, toolOptions: { [key: string]: string }) {
  if(Object.keys(toolOptions).length === 0) {
    return toolDefinitionMap;
  }

  const filteredToolDefinitionMap = new Map();

  for (const [name, toolDefinition] of toolDefinitionMap) {
    // Check if the tool's method is allowed
    const isMethodAllowed = toolDefinition.tags.length > 0 && toolDefinition.tags.every(tag => {
      const authorizedAction = toolOptions[tag];
      const authorizedMethod = crudToHttpMethod[authorizedAction as keyof typeof crudToHttpMethod];
      return authorizedAction === 'all' || authorizedMethod.includes(toolDefinition.method.toLowerCase());
    });
    
    // Check if ALL tags in the toolDefinition.tags are in the tool options
    const areAllTagsAllowed = toolDefinition.tags.length > 0 && 
                              toolDefinition.tags.every(tag => toolOptions[tag]);
    
    // Only include the tool if both its method and all its tags are allowed
    if (isMethodAllowed && areAllTagsAllowed) {
      filteredToolDefinitionMap.set(name, toolDefinition);
    }
  }

  return filteredToolDefinitionMap;
}
`;
}
