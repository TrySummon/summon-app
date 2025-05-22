import { ipcMain } from "electron";
import keytar from "keytar";
import {
  CREATE_MCP_CHANNEL,
  LIST_MCPS_CHANNEL,
  GET_MCP_CHANNEL,
  UPDATE_MCP_CHANNEL,
  DELETE_MCP_CHANNEL,
  MCP_GET_CREDENTIALS_CHANNEL,
  MCP_SAVE_CREDENTIALS_CHANNEL,
  MCP_CLEAR_CREDENTIALS_CHANNEL
} from "./mcp-channels";
import { mcpDb, McpData } from "@/helpers/db/mcp-db";
import { deleteMcpImpl, generateMcpImpl } from "@/helpers/mcp";

// Service name for keytar - used for storing credentials
const SERVICE_NAME = "toolman-mcp-credentials";
// Account name for keytar - used as a key for storing MCP credentials
const ACCOUNT_NAME = "tar";

export function registerMcpListeners() {
  // Create a new MCP configuration
  ipcMain.handle(CREATE_MCP_CHANNEL, async (_, mcpData: Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const mcpId = await mcpDb.createMcp(mcpData);
      await generateMcpImpl(mcpId);
      return {
        success: true,
        message: "MCP configuration created successfully",
        mcpId
      };
    } catch (error) {
      console.error("Error creating MCP configuration:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // List all MCPs
  ipcMain.handle(LIST_MCPS_CHANNEL, async () => {
    try {
      const mcps = await mcpDb.listMcps();
      return {
        success: true,
        mcps
      };
    } catch (error) {
      console.error("Error listing MCPs:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Get a specific MCP by ID
  ipcMain.handle(GET_MCP_CHANNEL, async (_, id: string) => {
    try {
      const mcpData = await mcpDb.getMcpById(id);
      
      if (!mcpData) {
        return {
          success: false,
          message: `MCP with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        mcp: mcpData
      };
    } catch (error) {
      console.error(`Error getting MCP with ID ${id}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Update an MCP
  ipcMain.handle(UPDATE_MCP_CHANNEL, async (_, request: { id: string; data: Partial<Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>> }) => {
    try {
      const { id, data } = request;
      const success = await mcpDb.updateMcp(id, data as any);
      await deleteMcpImpl(id);
      await generateMcpImpl(id);

      if (!success) {
        return {
          success: false,
          message: `MCP with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        message: "MCP updated successfully"
      };
    } catch (error) {
      console.error("Error updating MCP:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Delete an MCP
  ipcMain.handle(DELETE_MCP_CHANNEL, async (_, id: string) => {
    try {
      const success = await mcpDb.deleteMcp(id);
      await deleteMcpImpl(id);
      
      if (!success) {
        return {
          success: false,
          message: `MCP with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        message: "MCP deleted successfully"
      };
    } catch (error) {
      console.error(`Error deleting MCP with ID ${id}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Get credentials for a specific MCP
  ipcMain.handle(MCP_GET_CREDENTIALS_CHANNEL, async (_, mcpId: string) => {
    try {
      const credentials = await keytar.getPassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error("Error retrieving MCP credentials:", error);
      return null;
    }
  });

  // Save credentials for a specific MCP
  ipcMain.handle(MCP_SAVE_CREDENTIALS_CHANNEL, async (_, mcpId: string, credentials: any) => {
    try {
      await keytar.setPassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`, JSON.stringify(credentials));
      return true;
    } catch (error) {
      console.error("Error saving MCP credentials:", error);
      return false;
    }
  });

  // Clear credentials for a specific MCP
  ipcMain.handle(MCP_CLEAR_CREDENTIALS_CHANNEL, async (_, mcpId: string) => {
    try {
      await keytar.deletePassword(SERVICE_NAME, `${ACCOUNT_NAME}-${mcpId}`);
      return true;
    } catch (error) {
      console.error("Error clearing MCP credentials:", error);
      return false;
    }
  });
}
