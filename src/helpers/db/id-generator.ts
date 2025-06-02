import crypto from 'crypto';

/**
 * Generates a human-readable unique ID with the format: name-YYYYMMDD-HHMMSS-hash
 * @param name - The base name to include in the ID (will be sanitized)
 * @param prefix - Optional prefix to add before the name
 * @returns A readable unique ID
 */
export const generateReadableId = (name: string, prefix?: string): string => {
  // Sanitize the name: remove special characters, convert to lowercase, replace spaces with hyphens
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 20); // Limit length to keep ID manageable

  // Get current date and time
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const dateTime = `${year}${month}${day}-${hours}${minutes}${seconds}`;

  // Generate a short hash for uniqueness (8 characters)
  const hash = crypto.randomBytes(4).toString('hex');

  // Combine all parts
  const parts = [];
  if (prefix) {
    parts.push(prefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  if (sanitizedName) {
    parts.push(sanitizedName);
  }
  parts.push(dateTime);
  parts.push(hash);

  return parts.join('-');
};

/**
 * Generates a readable ID for API resources
 * @param apiName - The name of the API (extracted from OpenAPI spec if available)
 * @returns A readable unique ID with 'api' prefix
 */
export const generateApiId = (apiName?: string): string => {
  const name = apiName || 'unnamed-api';
  return generateReadableId(name, 'api');
};

/**
 * Generates a readable ID for MCP resources
 * @param mcpName - The name of the MCP server
 * @returns A readable unique ID with 'mcp' prefix
 */
export const generateMcpId = (mcpName: string): string => {
  return generateReadableId(mcpName, 'mcp');
};
