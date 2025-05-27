import { ipcMain } from "electron";
import {
  CREATE_MCP_CHANNEL,
  LIST_MCPS_CHANNEL,
  GET_MCP_CHANNEL,
  UPDATE_MCP_CHANNEL,
  DELETE_MCP_CHANNEL,
  GET_MCP_SERVER_STATUS_CHANNEL,
  GET_ALL_MCP_SERVER_STATUSES_CHANNEL,
  START_MCP_SERVER_CHANNEL,
  STOP_MCP_SERVER_CHANNEL,
  RESTART_MCP_SERVER_CHANNEL,
  GET_MCP_TOOLS_CHANNEL,
  CALL_MCP_TOOL_CHANNEL
} from "./mcp-channels";
import { callMcpTool, getMcpTools } from "./mcp-tools";
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

  // Get status of a specific MCP server
  ipcMain.handle(GET_MCP_SERVER_STATUS_CHANNEL, async (_, mcpId: string) => {
    try {
      const status = getMcpServerStatus(mcpId);
      
      // Create a serializable version of the status object
      // by removing the non-serializable serverProcess property
      const serializableStatus = status ? {
        ...status,
        client: undefined,
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
          client: undefined,
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
        client: undefined,
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
        client: undefined,
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

  // Get MCP tools
  ipcMain.handle(GET_MCP_TOOLS_CHANNEL, async (_, mcpId: string) => {
    try {
      const tools = await getMcpTools(mcpId);
      return {
        success: true,
        data: tools
      };
    } catch (error) {
      console.error(`Error getting MCP tools:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });

  // Call an MCP tool
  ipcMain.handle(CALL_MCP_TOOL_CHANNEL, async (_, {mcpId, name, args}: {mcpId: string, name: string, args: Record<string, any>}) => {
    try {
      const result = await callMcpTool(mcpId, name, args);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`Error calling MCP tool:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  });
}
