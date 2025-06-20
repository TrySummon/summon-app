import { ipcMain, BrowserWindow } from "electron";
import { WORKSPACE_CHANNELS } from "./workspace-channels";
import { workspaceDb, Workspace } from "@/lib/db/workspace-db";
import log from "electron-log/main";
import { refreshMcpJsonWatchers, startAllMcpServers } from "@/main";
import { stopAllMcpServers } from "@/lib/mcp";
import { connectAllExternalMcps } from "@/lib/external-mcp";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp/external-mcp-channels";

export const registerWorkspaceListeners = () => {
  // List all workspaces
  ipcMain.handle(
    WORKSPACE_CHANNELS.LIST_WORKSPACES,
    async (): Promise<Workspace[]> => {
      try {
        return await workspaceDb.listWorkspaces();
      } catch (error) {
        log.error("Error listing workspaces:", error);
        throw error;
      }
    },
  );

  // Get current workspace
  ipcMain.handle(
    WORKSPACE_CHANNELS.GET_CURRENT_WORKSPACE,
    async (): Promise<Workspace> => {
      try {
        return await workspaceDb.getCurrentWorkspace();
      } catch (error) {
        log.error("Error getting current workspace:", error);
        throw error;
      }
    },
  );

  // Set current workspace
  ipcMain.handle(
    WORKSPACE_CHANNELS.SET_CURRENT_WORKSPACE,
    async (_, workspaceId: string): Promise<boolean> => {
      try {
        log.info(`Switching to workspace: ${workspaceId}`);

        // Stop all currently running MCP servers (both internal and external)
        await stopAllMcpServers({
          parallel: false, // Sequential for more controlled workspace switching
          removeFromState: true,
        });

        // Switch to the new workspace
        const result = await workspaceDb.setCurrentWorkspace(workspaceId);

        if (result) {
          log.info(`Successfully switched to workspace: ${workspaceId}`);

          // Start all MCP servers for the new workspace
          log.info("Starting MCP servers for new workspace...");

          await startAllMcpServers();

          // Start external MCP servers and notify renderer
          try {
            const externalResults = await connectAllExternalMcps(true);

            // Notify the renderer process about the external MCP server updates
            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
              mainWindow.webContents.send(
                EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
                externalResults,
              );
            }

            log.info(
              "Successfully started external MCP servers for new workspace",
            );
          } catch (error) {
            log.error("Error starting external MCP servers:", error);
          }
        }

        return result;
      } catch (error) {
        log.error("Error setting current workspace:", error);
        throw error;
      }
    },
  );

  // Create workspace
  ipcMain.handle(
    WORKSPACE_CHANNELS.CREATE_WORKSPACE,
    async (_, name: string): Promise<Workspace> => {
      try {
        const workspace = await workspaceDb.createWorkspace(name);
        // Refresh MCP file watchers to include the new workspace
        await refreshMcpJsonWatchers();
        return workspace;
      } catch (error) {
        log.error("Error creating workspace:", error);
        throw error;
      }
    },
  );

  // Update workspace
  ipcMain.handle(
    WORKSPACE_CHANNELS.UPDATE_WORKSPACE,
    async (
      _,
      id: string,
      updates: Partial<Pick<Workspace, "name">>,
    ): Promise<boolean> => {
      try {
        return await workspaceDb.updateWorkspace(id, updates);
      } catch (error) {
        log.error("Error updating workspace:", error);
        throw error;
      }
    },
  );

  // Delete workspace
  ipcMain.handle(
    WORKSPACE_CHANNELS.DELETE_WORKSPACE,
    async (_, id: string): Promise<boolean> => {
      try {
        const result = await workspaceDb.deleteWorkspace(id);
        // Refresh MCP file watchers to remove the deleted workspace
        await refreshMcpJsonWatchers();
        return result;
      } catch (error) {
        log.error("Error deleting workspace:", error);
        throw error;
      }
    },
  );
};
