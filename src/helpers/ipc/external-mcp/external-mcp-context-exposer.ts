import { contextBridge, ipcRenderer } from "electron";
import {
  CONNECT_EXTERNAL_MCP_SERVER_CHANNEL,
  STOP_EXTERNAL_MCP_SERVER_CHANNEL,
  EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
} from "./external-mcp-channels";
import { McpServerState } from "@/helpers/mcp/state";

export function exposeExternalMcpContext() {
  contextBridge.exposeInMainWorld("externalMcpApi", {
    connectExternalMcpServer: (mcpId: string, force?: boolean) =>
      ipcRenderer.invoke(CONNECT_EXTERNAL_MCP_SERVER_CHANNEL, mcpId, force),

    stopExternalMcpServer: (mcpId: string) =>
      ipcRenderer.invoke(STOP_EXTERNAL_MCP_SERVER_CHANNEL, mcpId),

    onExternalMcpServersUpdated: (
      callback: (mcpServers: Record<string, McpServerState>) => void,
    ) => {
      const subscription = (
        _event: Electron.IpcRendererEvent,
        mcpServers: Record<string, McpServerState>,
      ) => callback(mcpServers);
      ipcRenderer.on(EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL, subscription);

      return () => {
        ipcRenderer.removeListener(
          EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
          subscription,
        );
      };
    },
  });
}
