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
// Account name for keytar - must match the one in mcp-listeners.ts
const ACCOUNT_NAME = "tar";

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

// Create a new MCP configuration with optional credentials
const createMcp = async (
  mcpData: McpSubmitData,
  credentials?: Record<string, McpAuth>,
): Promise<string> => {
  await ensureMcpDataDir();

  // Generate a unique ID for the MCP
  const mcpId = generateMcpId(mcpData.name);

  // Create the MCP data file with timestamps
  const now = new Date().toISOString();
  const fullMcpData: McpData = {
    ...mcpData,
    id: mcpId,
    createdAt: now,
    updatedAt: now,
  };

  await fs.writeFile(
    getMcpFilePath(mcpId),
    JSON.stringify(fullMcpData, null, 2),
  );

  // If credentials are provided, store them
  if (credentials && Object.keys(credentials).length > 0) {
    try {
      await keytar.setPassword(
        SERVICE_NAME,
        `${ACCOUNT_NAME}-${mcpId}`,
        JSON.stringify(credentials),
      );
    } catch (credError) {
      console.error(
        `Error storing credentials for MCP with ID ${mcpId}:`,
        credError,
      );
      // Continue even if credential storage fails
    }
  }

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
        // todo
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

    // Create a completely new MCP data object with the provided data
    // Only preserve the id and createdAt from the existing data
    const updatedMcpData: McpData = {
      id: existingMcpData.id,
      createdAt: existingMcpData.createdAt,
      updatedAt: new Date().toISOString(),
      name: mcpData.name,
      transport: mcpData.transport,
      apiGroups: mcpData.apiGroups,
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
    // Delete the MCP file
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
