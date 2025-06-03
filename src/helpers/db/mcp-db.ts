import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import keytar from "keytar";
import {
  McpAuth,
  McpSubmitData,
} from "@/components/mcp-builder/start-mcp-dialog";
import { generateMcpId } from "./id-generator";

// Define endpoint data structure
export interface McpEndpoint {
  apiId: string;
  apiName: string;
  method: string;
  path: string;
}

// Define the MCP data structure that will be stored in files
export interface McpApiGroup {
  name: string;
  serverUrl?: string;
  useMockData?: boolean;
  auth: McpAuth;
  endpoints?: McpEndpoint[];
}

export interface McpData {
  id: string;
  name: string;
  transport: "http";
  apiGroups: Record<string, McpApiGroup>;
  createdAt: string;
  updatedAt: string;
}

// Service name for keytar - must match the one in mcp-listeners.ts
const SERVICE_NAME = "agentport-mcp-credentials";

// Define the directory where MCP data will be stored
export const getMcpDataDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "mcp-data");
};

export const getMcpImplDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "mcp-impl");
};

// Ensure the MCP data directory exists
const ensureMcpDataDir = async () => {
  const mcpDataDir = getMcpDataDir();
  try {
    await fs.mkdir(mcpDataDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create MCP data directory:", error);
    throw error;
  }
};

// Get the file path for an MCP
const getMcpFilePath = (mcpId: string) => {
  return path.join(getMcpDataDir(), `${mcpId}.json`);
};

export const getMcpImplPath = (mcpId: string) => {
  return path.join(getMcpImplDir(), `${mcpId}`);
};

// Check if an MCP exists
const mcpExists = async (mcpId: string): Promise<boolean> => {
  try {
    await fs.access(getMcpFilePath(mcpId));
    return true;
  } catch {
    return false;
  }
};

// Helper function to create a keytar account name for MCP credentials
const getMcpCredentialKey = (mcpId: string, apiGroupName: string): string => {
  return `${mcpId}:${apiGroupName}`;
};

// Helper function to store credentials in keytar
const storeCredentials = async (
  mcpId: string,
  apiGroupName: string,
  auth: McpAuth,
): Promise<void> => {
  // Only store credentials for auth types that have sensitive data
  if (auth.type === "bearerToken" && auth.token) {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    await keytar.setPassword(
      SERVICE_NAME,
      key,
      JSON.stringify({ type: "bearerToken", token: auth.token }),
    );
  } else if (auth.type === "apiKey" && auth.key) {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    await keytar.setPassword(
      SERVICE_NAME,
      key,
      JSON.stringify({
        type: "apiKey",
        key: auth.key,
        name: auth.name,
        in: auth.in,
      }),
    );
  }
};

// Helper function to retrieve credentials from keytar
const retrieveCredentials = async (
  mcpId: string,
  apiGroupName: string,
): Promise<McpAuth | null> => {
  try {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    const credentialData = await keytar.getPassword(SERVICE_NAME, key);

    if (credentialData) {
      return JSON.parse(credentialData) as McpAuth;
    }
    return null;
  } catch (error) {
    console.error(
      `Error retrieving credentials for ${mcpId}:${apiGroupName}:`,
      error,
    );
    return null;
  }
};

// Helper function to delete credentials from keytar
const deleteCredentials = async (
  mcpId: string,
  apiGroupName: string,
): Promise<void> => {
  try {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    await keytar.deletePassword(SERVICE_NAME, key);
  } catch (error) {
    console.error(
      `Error deleting credentials for ${mcpId}:${apiGroupName}:`,
      error,
    );
  }
};

// Helper function to sanitize auth data for storage (removes sensitive fields)
const sanitizeAuthForStorage = (auth: McpAuth): McpAuth => {
  if (auth.type === "bearerToken") {
    return { type: "bearerToken" }; // Remove token
  } else if (auth.type === "apiKey") {
    return {
      type: "apiKey",
      name: auth.name,
      in: auth.in,
      // Remove key
    };
  }
  return auth; // noAuth doesn't have sensitive data
};

// Create a new MCP configuration
const createMcp = async (mcpData: McpSubmitData): Promise<string> => {
  await ensureMcpDataDir();

  // Generate a unique ID for the MCP
  const mcpId = generateMcpId(mcpData.name);

  // Store credentials securely and sanitize auth data for file storage
  const sanitizedApiGroups: Record<string, McpApiGroup> = {};

  for (const [groupName, group] of Object.entries(mcpData.apiGroups)) {
    // Store credentials in keytar
    await storeCredentials(mcpId, groupName, group.auth);

    // Create sanitized version for file storage
    sanitizedApiGroups[groupName] = {
      ...group,
      auth: sanitizeAuthForStorage(group.auth),
    };
  }

  // Create the MCP data file with timestamps and sanitized auth
  const now = new Date().toISOString();
  const fullMcpData: McpData = {
    ...mcpData,
    id: mcpId,
    apiGroups: sanitizedApiGroups,
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(
    getMcpFilePath(mcpId),
    JSON.stringify(fullMcpData, null, 2),
  );

  return mcpId;
};

// List all MCPs
const listMcps = async (): Promise<McpData[]> => {
  await ensureMcpDataDir();

  try {
    const files = await fs.readdir(getMcpDataDir());
    // Filter only MCP data files
    const mcpFiles = files.filter((file) => file.endsWith(".json"));

    const mcps: McpData[] = [];

    for (const file of mcpFiles) {
      try {
        const filePath = path.join(getMcpDataDir(), file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const mcpData = JSON.parse(fileContent) as McpData;
        // Never include credentials in list - they're already sanitized in storage
        mcps.push(mcpData);
      } catch (error) {
        console.error(`Error reading MCP file ${file}:`, error);
        // Continue with other files
      }
    }

    return mcps;
  } catch (error) {
    console.error("Error listing MCPs:", error);
    return [];
  }
};

// Get an MCP by ID
const getMcpById = async (
  id: string,
  includeCredentials: boolean = false,
): Promise<McpData | null> => {
  if (!(await mcpExists(id))) {
    return null;
  }

  try {
    const fileContent = await fs.readFile(getMcpFilePath(id), "utf-8");
    const mcpData = JSON.parse(fileContent) as McpData;

    // If requested, fetch and include credentials
    if (includeCredentials) {
      try {
        const apiGroupsWithCredentials: Record<string, McpApiGroup> = {};

        for (const [groupName, group] of Object.entries(mcpData.apiGroups)) {
          // Try to retrieve credentials from keytar
          const credentials = await retrieveCredentials(id, groupName);

          if (credentials) {
            // Merge stored credentials with the sanitized auth data
            apiGroupsWithCredentials[groupName] = {
              ...group,
              auth: credentials,
            };
          } else {
            // Keep the sanitized version if no credentials found
            apiGroupsWithCredentials[groupName] = group;
          }
        }

        return {
          ...mcpData,
          apiGroups: apiGroupsWithCredentials,
        };
      } catch (credError) {
        console.error(
          `Error fetching credentials for MCP with ID ${id}:`,
          credError,
        );
        // Continue without credentials if there's an error
      }
    }

    return mcpData;
  } catch (error) {
    console.error(`Error getting MCP with ID ${id}:`, error);
    return null;
  }
};

// Update an MCP - completely rewrites the file with new data
const updateMcp = async (
  id: string,
  mcpData: McpSubmitData,
): Promise<boolean> => {
  if (!(await mcpExists(id))) {
    return false;
  }

  try {
    // Get existing MCP data just for the id, createdAt fields
    const existingMcpData = await getMcpById(id);
    if (!existingMcpData) {
      return false;
    }

    // Delete old credentials from keytar
    for (const groupName of Object.keys(existingMcpData.apiGroups)) {
      await deleteCredentials(id, groupName);
    }

    // Store new credentials securely and sanitize auth data for file storage
    const sanitizedApiGroups: Record<string, McpApiGroup> = {};

    for (const [groupName, group] of Object.entries(mcpData.apiGroups)) {
      // Store credentials in keytar
      await storeCredentials(id, groupName, group.auth);

      // Create sanitized version for file storage
      sanitizedApiGroups[groupName] = {
        ...group,
        auth: sanitizeAuthForStorage(group.auth),
      };
    }

    // Create a completely new MCP data object with the provided data
    // Only preserve the id and createdAt from the existing data
    const updatedMcpData: McpData = {
      id: existingMcpData.id,
      createdAt: existingMcpData.createdAt,
      updatedAt: new Date().toISOString(),
      name: mcpData.name,
      transport: mcpData.transport,
      apiGroups: sanitizedApiGroups,
    };

    // Write the completely new data to the file
    await fs.writeFile(
      getMcpFilePath(id),
      JSON.stringify(updatedMcpData, null, 2),
    );

    return true;
  } catch (error) {
    console.error(`Error updating MCP with ID ${id}:`, error);
    return false;
  }
};

// Delete an MCP
const deleteMcp = async (id: string): Promise<boolean> => {
  if (!(await mcpExists(id))) {
    return false;
  }

  try {
    // Get the MCP data to know which credentials to delete
    const mcpData = await getMcpById(id);
    if (mcpData) {
      // Delete all credentials from keytar
      for (const groupName of Object.keys(mcpData.apiGroups)) {
        await deleteCredentials(id, groupName);
      }
    }

    // Delete the MCP data file
    await fs.unlink(getMcpFilePath(id));
    return true;
  } catch (error) {
    console.error(`Error deleting MCP with ID ${id}:`, error);
    return false;
  }
};

// Export the MCP database functions
export const mcpDb = {
  createMcp,
  listMcps,
  getMcpById,
  updateMcp,
  deleteMcp,
  mcpExists,
};
