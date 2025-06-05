/**
 * Safely stringify a JSON object with proper error handling
 *
 * @param obj Object to stringify
 * @param defaultValue Default value to return if stringify fails
 * @returns JSON string or default value
 */
export function safeJsonStringify(
  obj: Record<string, unknown>,
  defaultValue: string = "{}",
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
      index === 0 ? word.toLowerCase() : word.toUpperCase(),
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
