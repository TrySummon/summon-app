import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import fsSync from 'fs';

// Define endpoint data structure
export interface McpEndpoint {
  apiId: string;
  apiName: string;
  method: string;
  path: string;
  operation: any;
}

// Define the MCP data structure that will be stored in files
export interface McpData {
  id: string;
  name: string;
  apiGroups: Record<string, {
    serverUrl?: string;
    useMockData: boolean;
    auth: {
      type: string;
      [key: string]: any;
    };
    endpoints?: McpEndpoint[];
  }>;
  createdAt: string;
  updatedAt: string;
  // Optional credentials property populated by getMcpById when includeCredentials is true
  credentials?: Record<string, any>;
}

// Define the directory where MCP data will be stored
export const getMcpDataDir = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'mcp-data');
};

// Ensure the MCP data directory exists
const ensureMcpDataDir = async () => {
  const mcpDataDir = getMcpDataDir();
  try {
    await fs.mkdir(mcpDataDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create MCP data directory:', error);
    throw error;
  }
};

// Get the file path for an MCP
const getMcpFilePath = (mcpId: string) => {
  return path.join(getMcpDataDir(), `${mcpId}.json`);
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
const createMcp = async (mcpData: Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>, credentials?: Record<string, any>): Promise<string> => {
  await ensureMcpDataDir();
  
  // Generate a unique ID for the MCP
  const mcpId = uuidv4();
  
  // Create the MCP data file with timestamps
  const now = new Date().toISOString();
  const fullMcpData: McpData = {
    ...mcpData,
    id: mcpId,
    createdAt: now,
    updatedAt: now
  };
  
  await fs.writeFile(getMcpFilePath(mcpId), JSON.stringify(fullMcpData, null, 2));
  
  // If credentials are provided, store them
  if (credentials && Object.keys(credentials).length > 0) {
    try {
      await keytar.setPassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`, JSON.stringify(credentials));
    } catch (credError) {
      console.error(`Error storing credentials for MCP with ID ${mcpId}:`, credError);
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
    const mcpFiles = files.filter(file => file.endsWith('.json'));
    
    const mcps: McpData[] = [];
    
    for (const file of mcpFiles) {
      try {
        const filePath = path.join(getMcpDataDir(), file);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const mcpData = JSON.parse(fileContent) as McpData;
        mcps.push(mcpData);
      } catch (error) {
        console.error(`Error reading MCP file ${file}:`, error);
        // Continue with other files
      }
    }
    
    return mcps;
  } catch (error) {
    console.error('Error listing MCPs:', error);
    return [];
  }
};

// Import keytar for credentials access
import keytar from 'keytar';

// Service name for keytar - must match the one in mcp-listeners.ts
const SERVICE_NAME = "toolman-mcp-credentials";
// Account name for keytar - must match the one in mcp-listeners.ts
const ACCOUNT_NAME = "tar";

// Get an MCP by ID
const getMcpById = async (id: string, includeCredentials: boolean = false): Promise<McpData | null> => {
  if (!await mcpExists(id)) {
    return null;
  }
  
  try {
    const fileContent = await fs.readFile(getMcpFilePath(id), 'utf-8');
    const mcpData = JSON.parse(fileContent) as McpData;
    
    // If requested, fetch and include credentials
    if (includeCredentials) {
      try {
        const credentialsJson = await keytar.getPassword(SERVICE_NAME, `${ACCOUNT_NAME}-${id}`);
        if (credentialsJson) {
          const credentials = JSON.parse(credentialsJson);
          
          // Add credentials to the MCP data
          mcpData.credentials = credentials;
        }
      } catch (credError) {
        console.error(`Error fetching credentials for MCP with ID ${id}:`, credError);
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
const updateMcp = async (id: string, mcpData: Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
  if (!await mcpExists(id)) {
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
      apiGroups: mcpData.apiGroups
    };
    
    // Write the completely new data to the file
    await fs.writeFile(getMcpFilePath(id), JSON.stringify(updatedMcpData, null, 2));
    
    return true;
  } catch (error) {
    console.error(`Error updating MCP with ID ${id}:`, error);
    return false;
  }
};

// Delete an MCP
const deleteMcp = async (id: string): Promise<boolean> => {
  if (!await mcpExists(id)) {
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

// Save credentials for an MCP
const saveCredentials = async (mcpId: string, credentials: Record<string, any>): Promise<boolean> => {
  try {
    await keytar.setPassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`, JSON.stringify(credentials));
    return true;
  } catch (error) {
    console.error(`Error saving credentials for MCP with ID ${mcpId}:`, error);
    return false;
  }
};

// Clear credentials for an MCP
const clearCredentials = async (mcpId: string): Promise<boolean> => {
  try {
    await keytar.deletePassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`);
    return true;
  } catch (error) {
    console.error(`Error clearing credentials for MCP with ID ${mcpId}:`, error);
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
  saveCredentials,
  clearCredentials
};
