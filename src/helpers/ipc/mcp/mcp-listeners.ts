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
  MCP_CLEAR_CREDENTIALS_CHANNEL,
  GET_MCP_SERVER_STATUS_CHANNEL,
  GET_ALL_MCP_SERVER_STATUSES_CHANNEL,
  START_MCP_SERVER_CHANNEL,
  STOP_MCP_SERVER_CHANNEL,
  RESTART_MCP_SERVER_CHANNEL
} from "./mcp-channels";
import { mcpDb, McpData } from "@/helpers/db/mcp-db";
import { 
  deleteMcpImpl, 
  generateMcpImpl, 
  startMcpServer, 
  stopMcpServer, 
  restartMcpServer,
  getMcpServerStatus,
  getAllMcpServerStatuses,
} from "@/helpers/mcp";

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
      startMcpServer(mcpId);
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
      await stopMcpServer(id);
      await deleteMcpImpl(id);
      await generateMcpImpl(id);
      startMcpServer(id);
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
      await stopMcpServer(id);
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

  // Get status of a specific MCP server
  ipcMain.handle(GET_MCP_SERVER_STATUS_CHANNEL, async (_, mcpId: string) => {
    try {
      const status = getMcpServerStatus(mcpId);
      
      // Create a serializable version of the status object
      // by removing the non-serializable serverProcess property
      const serializableStatus = status ? {
        ...status,
        serverProcess: undefined, // Remove the non-serializable process
        // Convert any other non-serializable properties if needed
        mockProcesses: Object.keys(status.mockProcesses || {}).reduce((acc, key) => {
          acc[key] = {
            ...status.mockProcesses[key],
            process: undefined // Remove the non-serializable process
          };
          return acc;
        }, {} as Record<string, any>)
      } : null;
      
      return {
        success: true,
        data: serializableStatus
      };
    } catch (error) {
      console.error(`Error getting MCP server status for ${mcpId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Get status of all MCP servers
  ipcMain.handle(GET_ALL_MCP_SERVER_STATUSES_CHANNEL, async () => {
    try {
      const statuses = getAllMcpServerStatuses();
      
      // Create serializable versions of all status objects
      const serializableStatuses: Record<string, any> = {};
      
      Object.keys(statuses).forEach(mcpId => {
        const status = statuses[mcpId];
        serializableStatuses[mcpId] = {
          ...status,
          serverProcess: undefined, // Remove the non-serializable process
          // Convert any other non-serializable properties if needed
          mockProcesses: Object.keys(status.mockProcesses || {}).reduce((acc, key) => {
            acc[key] = {
              ...status.mockProcesses[key],
              process: undefined // Remove the non-serializable process
            };
            return acc;
          }, {} as Record<string, any>)
        };
      });
      
      return {
        success: true,
        data: serializableStatuses
      };
    } catch (error) {
      console.error("Error getting all MCP server statuses:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Start an MCP server
  ipcMain.handle(START_MCP_SERVER_CHANNEL, async (_, mcpId: string) => {
    try {
      const serverState = await startMcpServer(mcpId);
      
      // Create a serializable version of the server state
      const serializableState = {
        ...serverState,
        serverProcess: undefined, // Remove the non-serializable process
        // Convert any other non-serializable properties if needed
        mockProcesses: Object.keys(serverState.mockProcesses || {}).reduce((acc, key) => {
          acc[key] = {
            ...serverState.mockProcesses[key],
            process: undefined // Remove the non-serializable process
          };
          return acc;
        }, {} as Record<string, any>)
      };
      
      return {
        success: true,
        data: serializableState
      };
    } catch (error) {
      console.error(`Error starting MCP server ${mcpId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Stop an MCP server
  ipcMain.handle(STOP_MCP_SERVER_CHANNEL, async (_, mcpId: string) => {
    try {
      const serverState = await stopMcpServer(mcpId);
      
      // Create a serializable version of the server state
      const serializableState = serverState ? {
        ...serverState,
        serverProcess: undefined, // Remove the non-serializable process
        // Convert any other non-serializable properties if needed
        mockProcesses: Object.keys(serverState.mockProcesses || {}).reduce((acc, key) => {
          acc[key] = {
            ...serverState.mockProcesses[key],
            process: undefined // Remove the non-serializable process
          };
          return acc;
        }, {} as Record<string, any>)
      } : null;
      
      return {
        success: true,
        data: serializableState
      };
    } catch (error) {
      console.error(`Error stopping MCP server ${mcpId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Restart an MCP server
  ipcMain.handle(RESTART_MCP_SERVER_CHANNEL, async (_, mcpId: string) => {
    try {
      const serverState = await restartMcpServer(mcpId);
      
      // Create a serializable version of the server state
      const serializableState = {
        ...serverState,
        serverProcess: undefined, // Remove the non-serializable process
        // Convert any other non-serializable properties if needed
        mockProcesses: Object.keys(serverState.mockProcesses || {}).reduce((acc, key) => {
          acc[key] = {
            ...serverState.mockProcesses[key],
            process: undefined // Remove the non-serializable process
          };
          return acc;
        }, {} as Record<string, any>)
      };
      
      return {
        success: true,
        data: serializableState
      };
    } catch (error) {
      console.error(`Error restarting MCP server ${mcpId}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
