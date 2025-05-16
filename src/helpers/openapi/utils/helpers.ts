/**
 * General helper utilities for OpenAPI to MCP generator
 */

/**
 * Safely stringify a JSON object with proper error handling
 *
 * @param obj Object to stringify
 * @param defaultValue Default value to return if stringify fails
 * @returns JSON string or default value
 */
export function safeJsonStringify(
  obj: any,
  defaultValue: string = "{}"
): string {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.warn(`Failed to stringify object: ${e}`);
    return defaultValue;
  }
}

/**
 * Sanitizes a string for use in template strings
 *
 * @param str String to sanitize
 * @returns Sanitized string safe for use in template literals
 */
export function sanitizeForTemplate(str: string): string {
  return (str || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

/**
 * Converts a string to camelCase
 *
 * @param str String to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Converts a string to PascalCase
 *
 * @param str String to convert
 * @returns PascalCase string
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
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

/**
 * Creates a valid variable name from a string
 *
 * @param str Input string
 * @returns Valid JavaScript variable name
 */
export function toValidVariableName(str: string): string {
  // Replace non-alphanumeric characters with underscores
  const sanitized = str.replace(/[^a-zA-Z0-9_$]/g, "_");

  // Ensure the variable name doesn't start with a number
  return sanitized.match(/^[0-9]/) ? "_" + sanitized : sanitized;
}

/**
 * Checks if a string is a valid JavaScript identifier
 *
 * @param str String to check
 * @returns True if valid identifier, false otherwise
 */
export function isValidIdentifier(str: string): boolean {
  // Check if the string is a valid JavaScript identifier
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

/**
 * Formats a string for use in code comments
 *
 * @param str String to format
 * @param maxLineLength Maximum line length
 * @returns Formatted comment string
 */
export function formatComment(str: string, maxLineLength: number = 80): string {
  if (!str) return "";

  const words = str.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if ((currentLine + " " + word).length <= maxLineLength) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n * ");
}
