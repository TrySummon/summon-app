import { ipcMain } from "electron";
import path from "path";
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
  CALL_MCP_TOOL_CHANNEL,
  GET_MCP_PROMPTS_CHANNEL,
  GET_MCP_RESOURCES_CHANNEL,
  OPEN_USER_DATA_MCP_JSON_FILE_CHANNEL,
  DOWNLOAD_MCP_ZIP_CHANNEL,
  SHOW_FILE_IN_FOLDER_CHANNEL,
} from "./mcp-channels";
import {
  callMcpTool,
  getMcpTools,
  getMcpPrompts,
  getMcpResources,
} from "./mcp-capabilities";
import { mcpDb } from "@/lib/db/mcp-db";
import {
  deleteMcpImpl,
  generateMcpImpl,
  startMcpServer,
  stopMcpServer,
  restartMcpServer,
  getMcpServerStatus,
  getAllMcpServerStatuses,
  downloadMcpZip,
  showFileInFolder,
} from "@/lib/mcp";
import { McpSubmitData } from "@/components/mcp-builder/start-mcp-dialog";
import { McpServerState } from "@/lib/mcp/state";
import log from "electron-log/main";

export function registerMcpListeners() {
  // Create a new MCP configuration
  ipcMain.handle(CREATE_MCP_CHANNEL, async (_, mcpData: McpSubmitData) => {
    try {
      const mcpId = await mcpDb.createMcp(mcpData);
      await generateMcpImpl(mcpId);
      startMcpServer(mcpId);
      return {
        success: true,
        message: "MCP configuration created successfully",
        mcpId,
      };
    } catch (error) {
      log.error("Error creating MCP configuration:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // List all MCPs
  ipcMain.handle(LIST_MCPS_CHANNEL, async () => {
    try {
      const mcps = await mcpDb.listMcps();
      return {
        success: true,
        mcps,
      };
    } catch (error) {
      log.error("Error listing MCPs:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get a specific MCP by ID
  ipcMain.handle(GET_MCP_CHANNEL, async (_, id: string) => {
    try {
      const mcpData = await mcpDb.getMcpById(id, true);

      if (!mcpData) {
        return {
          success: false,
          message: `MCP with ID ${id} not found`,
        };
      }

      return {
        success: true,
        mcp: mcpData,
      };
    } catch (error) {
      log.error(`Error getting MCP with ID ${id}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Update an MCP
  ipcMain.handle(
    UPDATE_MCP_CHANNEL,
    async (
      _,
      request: {
        id: string;
        data: McpSubmitData;
      },
    ) => {
      try {
        const { id, data } = request;
        const success = await mcpDb.updateMcp(id, data);
        await stopMcpServer(id);
        await deleteMcpImpl(id);
        await generateMcpImpl(id);
        startMcpServer(id);
        if (!success) {
          return {
            success: false,
            message: `MCP with ID ${id} not found`,
          };
        }

        return {
          success: true,
          message: "MCP updated successfully",
        };
      } catch (error) {
        log.error("Error updating MCP:", error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Delete an MCP
  ipcMain.handle(DELETE_MCP_CHANNEL, async (_, id: string) => {
    try {
      const success = await mcpDb.deleteMcp(id);
      await stopMcpServer(id);
      await deleteMcpImpl(id);
      if (!success) {
        return {
          success: false,
          message: `MCP with ID ${id} not found`,
        };
      }

      return {
        success: true,
        message: "MCP deleted successfully",
      };
    } catch (error) {
      log.error(`Error deleting MCP with ID ${id}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get status of a specific MCP server
  ipcMain.handle(GET_MCP_SERVER_STATUS_CHANNEL, async (_, mcpId: string) => {
    try {
      const status = getMcpServerStatus(mcpId);

      // Create a serializable version of the status object
      // by removing the non-serializable serverProcess property
      const serializableStatus = status
        ? {
            ...status,
            client: undefined,
            expressServer: undefined, // Remove the non-serializable process
            // Convert any other non-serializable properties if needed
            mockProcesses: undefined,
          }
        : null;

      return {
        success: true,
        data: serializableStatus,
      };
    } catch (error) {
      log.error(`Error getting MCP server status for ${mcpId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get status of all MCP servers
  ipcMain.handle(GET_ALL_MCP_SERVER_STATUSES_CHANNEL, async () => {
    try {
      const statuses = getAllMcpServerStatuses();

      // Create serializable versions of all status objects
      const serializableStatuses: Record<string, McpServerState> = {};

      Object.keys(statuses).forEach((mcpId) => {
        const status = statuses[mcpId];
        serializableStatuses[mcpId] = {
          ...status,
          client: undefined,
          expressServer: undefined, // Remove the non-serializable process
          mockProcesses: {},
        };
      });

      return {
        success: true,
        data: serializableStatuses,
      };
    } catch (error) {
      log.error("Error getting all MCP server statuses:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
        expressServer: undefined, // Remove the non-serializable process
        mockProcesses: {},
      };

      return {
        success: true,
        data: serializableState,
      };
    } catch (error) {
      log.error(`Error starting MCP server ${mcpId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Stop an MCP server
  ipcMain.handle(STOP_MCP_SERVER_CHANNEL, async (_, mcpId: string) => {
    try {
      const serverState = await stopMcpServer(mcpId);

      // Create a serializable version of the server state
      const serializableState = serverState
        ? {
            ...serverState,
            client: undefined,
            expressServer: undefined, // Remove the non-serializable process
            mockProcesses: undefined,
          }
        : null;

      return {
        success: true,
        data: serializableState,
      };
    } catch (error) {
      log.error(`Error stopping MCP server ${mcpId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
        client: undefined,
        expressServer: undefined, // Remove the non-serializable process
        // Convert any other non-serializable properties if needed
        mockProcesses: {},
      };

      return {
        success: true,
        data: serializableState,
      };
    } catch (error) {
      log.error(`Error restarting MCP server ${mcpId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get MCP tools
  ipcMain.handle(GET_MCP_TOOLS_CHANNEL, async (_, mcpId: string) => {
    try {
      const tools = await getMcpTools(mcpId);
      return {
        success: true,
        data: tools,
      };
    } catch (error) {
      log.error(`Error getting MCP tools:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get MCP prompts
  ipcMain.handle(GET_MCP_PROMPTS_CHANNEL, async (_, mcpId: string) => {
    try {
      const prompts = await getMcpPrompts(mcpId);
      return {
        success: true,
        data: prompts,
      };
    } catch (error) {
      log.error(`Error getting MCP prompts:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Get MCP resources
  ipcMain.handle(GET_MCP_RESOURCES_CHANNEL, async (_, mcpId: string) => {
    try {
      const resources = await getMcpResources(mcpId);
      return {
        success: true,
        data: resources,
      };
    } catch (error) {
      log.error(`Error getting MCP resources:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Call an MCP tool
  ipcMain.handle(
    CALL_MCP_TOOL_CHANNEL,
    async (
      _,
      {
        mcpId,
        name,
        args,
      }: { mcpId: string; name: string; args: Record<string, unknown> },
    ) => {
      try {
        const result = await callMcpTool(mcpId, name, args);
        return {
          success: true,
          data: result,
        };
      } catch (error) {
        log.error(`Error calling MCP tool:`, error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Open the mcp.json file in the current workspace directory
  ipcMain.handle(OPEN_USER_DATA_MCP_JSON_FILE_CHANNEL, async () => {
    try {
      // Get workspace-specific mcp.json path using the same function as main.ts
      const { workspaceDb } = await import("@/lib/db/workspace-db");
      const currentWorkspace = await workspaceDb.getCurrentWorkspace();
      const workspaceDataDir = workspaceDb.getWorkspaceDataDir(
        currentWorkspace.id,
      );
      const mcpJsonPath = path.join(workspaceDataDir, "mcp.json");

      // Open the file with the default editor
      await showFileInFolder(mcpJsonPath);

      return {
        success: true,
      };
    } catch (error) {
      log.error("Error opening mcp.json file:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Download MCP zip
  ipcMain.handle(DOWNLOAD_MCP_ZIP_CHANNEL, async (_, mcpId: string) => {
    try {
      const result = await downloadMcpZip(mcpId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      log.error(`Error downloading MCP zip:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Show file in folder
  ipcMain.handle(SHOW_FILE_IN_FOLDER_CHANNEL, async (_, filePath: string) => {
    try {
      await showFileInFolder(filePath);
      return {
        success: true,
      };
    } catch (error) {
      log.error(`Error showing file in folder:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });
}
