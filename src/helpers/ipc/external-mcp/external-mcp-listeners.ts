import { ipcMain } from "electron";
import {
  CONNECT_EXTERNAL_MCP_SERVER_CHANNEL,
  STOP_EXTERNAL_MCP_SERVER_CHANNEL,
} from "./external-mcp-channels";
import {
  connectExternalMcp,
  readMcpJsonFile,
  stopExternalMcp,
} from "@/helpers/external-mcp";
import log from "electron-log";

export function registerExternalMcpListeners() {
  // Start an MCP server
  ipcMain.handle(
    CONNECT_EXTERNAL_MCP_SERVER_CHANNEL,
    async (_, mcpId: string, force?: boolean) => {
      try {
        const config = await readMcpJsonFile();
        const serverConfig = config.mcpServers[mcpId];
        const serverState = await connectExternalMcp(
          mcpId,
          serverConfig,
          force,
        );

        // Create a serializable version of the server state
        const serializableState = {
          ...serverState,
          client: undefined,
        };

        return {
          success: true,
          data: serializableState,
        };
      } catch (error) {
        log.error(`Error connecting MCP server ${mcpId}:`, error);
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "Unknown error occurred",
        };
      }
    },
  );

  // Stop an external MCP server
  ipcMain.handle(STOP_EXTERNAL_MCP_SERVER_CHANNEL, async (_, mcpId: string) => {
    try {
      const serverState = await stopExternalMcp(mcpId);

      // Create a serializable version of the server state
      const serializableState = serverState
        ? {
            ...serverState,
            client: undefined,
          }
        : null;

      return {
        success: true,
        data: serializableState,
      };
    } catch (error) {
      log.error(`Error stopping external MCP server ${mcpId}:`, error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });
}
