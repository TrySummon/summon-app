import { safeStorage, app } from "electron";
import path from "path";
import fs from "fs/promises";
import { McpAuth } from "@/components/mcp-builder/api-config";
import { generateMcpId } from "./id-generator";
import log from "electron-log/main";
import { workspaceDb } from "./workspace-db";
import { McpToolDefinitionWithoutAuth } from "../mcp/types";

// Define the MCP data structure that will be stored in files
export interface McpApiGroup {
  name: string;
  serverUrl?: string;
  toolPrefix?: string;
  useMockData?: boolean;
  auth: McpAuth;
  tools?: McpToolDefinitionWithoutAuth[];
}

export interface McpData {
  id: string;
  name: string;
  transport: "http";
  apiGroups: Record<string, McpApiGroup>;
  createdAt: string;
  updatedAt: string;
}

export type McpSubmitData = Omit<McpData, "id" | "createdAt" | "updatedAt">;

// Get workspace-specific directories
const getMcpDataDir = async () => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  const workspaceDataDir = workspaceDb.getWorkspaceDataDir(currentWorkspace.id);
  return path.join(workspaceDataDir, "mcp-data");
};

// Export for main.ts usage
export { getMcpDataDir };

export const getMcpImplDir = async (mcpId?: string) => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  const workspaceDataDir = workspaceDb.getWorkspaceDataDir(currentWorkspace.id);
  const mcpImplDir = path.join(workspaceDataDir, "mcp-impl");

  if (mcpId) {
    return path.join(mcpImplDir, mcpId);
  }
  return mcpImplDir;
};

// Alias for backward compatibility
export const getMcpImplPath = async (mcpId: string) => {
  return getMcpImplDir(mcpId);
};

export const getMcpImplToolsDir = async (mcpId: string) => {
  const mcpImplDir = await getMcpImplDir(mcpId);
  return path.join(mcpImplDir, "src", "tools");
};

export const getMcpImplToolPath = async (mcpId: string, toolName: string) => {
  const toolsDir = await getMcpImplToolsDir(mcpId);
  return path.join(toolsDir, `${toolName}.json`);
};

// Credentials are shared across workspaces - stored in root credentials directory
const getCredentialsDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "credentials");
};

// Ensure directories exist
const ensureCredentialsDir = async () => {
  const credentialsDir = getCredentialsDir();
  try {
    await fs.access(credentialsDir);
  } catch {
    await fs.mkdir(credentialsDir, { recursive: true });
  }
};

const ensureMcpDataDir = async () => {
  const mcpDataDir = await getMcpDataDir();
  try {
    await fs.mkdir(mcpDataDir, { recursive: true });
  } catch (error) {
    log.error("Failed to create MCP data directory:", error);
    throw error;
  }
};

// Get file paths
const getCredentialFilePath = (key: string) => {
  const credentialsDir = getCredentialsDir();
  return path.join(credentialsDir, `${key}.enc`);
};

const getMcpFilePath = async (mcpId: string) => {
  const mcpDataDir = await getMcpDataDir();
  return path.join(mcpDataDir, `${mcpId}.json`);
};

// Check if an MCP exists
const mcpExists = async (mcpId: string): Promise<boolean> => {
  try {
    const filePath = await getMcpFilePath(mcpId);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Helper function to create a keytar account name for MCP credentials
const getMcpCredentialKey = (mcpId: string, apiGroupName: string): string => {
  return `${mcpId}:${apiGroupName}`;
};

// Helper function to store credentials using safeStorage
const storeCredentials = async (
  mcpId: string,
  apiGroupName: string,
  auth: McpAuth,
): Promise<void> => {
  // Only store credentials for auth types that have sensitive data
  if (auth.type === "bearerToken" && auth.token) {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    const credentialData = JSON.stringify({
      type: "bearerToken",
      token: auth.token,
    });

    if (safeStorage.isEncryptionAvailable()) {
      await ensureCredentialsDir();
      const encrypted = safeStorage.encryptString(credentialData);
      const filePath = getCredentialFilePath(key);
      await fs.writeFile(filePath, encrypted);
    } else {
      log.warn("Encryption not available, credentials will not be stored");
    }
  } else if (auth.type === "apiKey" && auth.key) {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    const credentialData = JSON.stringify({
      type: "apiKey",
      key: auth.key,
      name: auth.name,
      in: auth.in,
    });

    if (safeStorage.isEncryptionAvailable()) {
      await ensureCredentialsDir();
      const encrypted = safeStorage.encryptString(credentialData);
      const filePath = getCredentialFilePath(key);
      await fs.writeFile(filePath, encrypted);
    } else {
      log.warn("Encryption not available, credentials will not be stored");
    }
  }
};

// Helper function to retrieve credentials from safeStorage
const retrieveCredentials = async (
  mcpId: string,
  apiGroupName: string,
): Promise<McpAuth | null> => {
  try {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    const filePath = getCredentialFilePath(key);

    if (!safeStorage.isEncryptionAvailable()) {
      log.warn("Encryption not available, cannot retrieve credentials");
      return null;
    }

    try {
      const encryptedData = await fs.readFile(filePath);
      const decryptedData = safeStorage.decryptString(encryptedData);
      return JSON.parse(decryptedData) as McpAuth;
    } catch {
      // File doesn't exist or can't be read
      return null;
    }
  } catch {
    log.error(`Error retrieving credentials for ${mcpId}:${apiGroupName}:`);
    return null;
  }
};

// Helper function to delete credentials from safeStorage
const deleteCredentials = async (
  mcpId: string,
  apiGroupName: string,
): Promise<void> => {
  try {
    const key = getMcpCredentialKey(mcpId, apiGroupName);
    const filePath = getCredentialFilePath(key);

    try {
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, which is fine
    }
  } catch {
    log.error(`Error deleting credentials for ${mcpId}:${apiGroupName}:`);
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
    // Store credentials in safeStorage
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

  const filePath = await getMcpFilePath(mcpId);
  await fs.writeFile(filePath, JSON.stringify(fullMcpData, null, 2));

  return mcpId;
};

// List all MCPs in current workspace
const listMcps = async (): Promise<McpData[]> => {
  await ensureMcpDataDir();

  try {
    const mcpDataDir = await getMcpDataDir();
    const files = await fs.readdir(mcpDataDir);
    // Filter only MCP data files
    const mcpFiles = files.filter((file) => file.endsWith(".json"));

    const mcps: McpData[] = [];

    for (const file of mcpFiles) {
      try {
        const filePath = path.join(mcpDataDir, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const mcpData = JSON.parse(fileContent) as McpData;
        // Never include credentials in list - they're already sanitized in storage
        mcps.push(mcpData);
      } catch {
        // Continue with other files
      }
    }

    return mcps;
  } catch {
    log.error("Error listing MCPs:");
    return [];
  }
};

// Get an MCP by ID from current workspace
const getMcpById = async (
  id: string,
  includeCredentials: boolean = false,
): Promise<McpData | null> => {
  if (!(await mcpExists(id))) {
    return null;
  }

  try {
    const filePath = await getMcpFilePath(id);
    const fileContent = await fs.readFile(filePath, "utf-8");
    const mcpData = JSON.parse(fileContent) as McpData;

    // If requested, fetch and include credentials
    if (includeCredentials) {
      try {
        const apiGroupsWithCredentials: Record<string, McpApiGroup> = {};

        for (const [groupName, group] of Object.entries(mcpData.apiGroups)) {
          // Try to retrieve credentials from safeStorage
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
      } catch {
        // Continue without credentials if there's an error
      }
    }

    return mcpData;
  } catch {
    log.error(`Error getting MCP with ID ${id}:`);
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

    // Delete old credentials from safeStorage
    for (const groupName of Object.keys(existingMcpData.apiGroups)) {
      await deleteCredentials(id, groupName);
    }

    // Store new credentials securely and sanitize auth data for file storage
    const sanitizedApiGroups: Record<string, McpApiGroup> = {};

    for (const [groupName, group] of Object.entries(mcpData.apiGroups)) {
      // Store credentials in safeStorage
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
    const filePath = await getMcpFilePath(id);
    await fs.writeFile(filePath, JSON.stringify(updatedMcpData, null, 2));

    return true;
  } catch {
    log.error(`Error updating MCP with ID ${id}:`);
    return false;
  }
};

// Delete an MCP from current workspace
const deleteMcp = async (id: string): Promise<boolean> => {
  if (!(await mcpExists(id))) {
    return false;
  }

  try {
    // Get the MCP data to know which credentials to delete
    const mcpData = await getMcpById(id);
    if (mcpData) {
      // Delete all credentials from safeStorage
      for (const groupName of Object.keys(mcpData.apiGroups)) {
        await deleteCredentials(id, groupName);
      }
    }

    // Delete the MCP data file
    const filePath = await getMcpFilePath(id);
    await fs.unlink(filePath);
    return true;
  } catch {
    log.error(`Error deleting MCP with ID ${id}:`);
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
