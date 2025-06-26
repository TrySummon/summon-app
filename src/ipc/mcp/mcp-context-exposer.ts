import { contextBridge, ipcRenderer } from "electron";
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
  GET_MCP_RESOURCES_CHANNEL,
  GET_MCP_PROMPTS_CHANNEL,
  CALL_MCP_TOOL_CHANNEL,
  OPEN_USER_DATA_MCP_JSON_FILE_CHANNEL,
  DOWNLOAD_MCP_ZIP_CHANNEL,
  SHOW_FILE_IN_FOLDER_CHANNEL,
} from "./mcp-channels";
import { McpData } from "@/lib/db/mcp-db";

export function exposeMcpContext() {
  contextBridge.exposeInMainWorld("mcpApi", {
    createMcp: (mcpData: Omit<McpData, "id" | "createdAt" | "updatedAt">) => {
      return ipcRenderer.invoke(CREATE_MCP_CHANNEL, mcpData);
    },

    listMcps: () => {
      return ipcRenderer.invoke(LIST_MCPS_CHANNEL);
    },

    getMcp: (id: string) => {
      return ipcRenderer.invoke(GET_MCP_CHANNEL, id);
    },

    updateMcp: (
      id: string,
      data: Partial<Omit<McpData, "id" | "createdAt" | "updatedAt">>,
    ) => {
      return ipcRenderer.invoke(UPDATE_MCP_CHANNEL, { id, data });
    },

    deleteMcp: (id: string) => {
      return ipcRenderer.invoke(DELETE_MCP_CHANNEL, id);
    },

    // MCP server operations
    getMcpServerStatus: (mcpId: string) => {
      return ipcRenderer.invoke(GET_MCP_SERVER_STATUS_CHANNEL, mcpId);
    },

    getAllMcpServerStatuses: () => {
      return ipcRenderer.invoke(GET_ALL_MCP_SERVER_STATUSES_CHANNEL);
    },

    startMcpServer: (mcpId: string) => {
      return ipcRenderer.invoke(START_MCP_SERVER_CHANNEL, mcpId);
    },

    stopMcpServer: (mcpId: string) => {
      return ipcRenderer.invoke(STOP_MCP_SERVER_CHANNEL, mcpId);
    },

    restartMcpServer: (mcpId: string) => {
      return ipcRenderer.invoke(RESTART_MCP_SERVER_CHANNEL, mcpId);
    },

    getMcpTools: (mcpId: string) => {
      return ipcRenderer.invoke(GET_MCP_TOOLS_CHANNEL, mcpId);
    },

    getMcpResources: (mcpId: string) => {
      return ipcRenderer.invoke(GET_MCP_RESOURCES_CHANNEL, mcpId);
    },

    getMcpPrompts: (mcpId: string) => {
      return ipcRenderer.invoke(GET_MCP_PROMPTS_CHANNEL, mcpId);
    },

    callMcpTool: async (
      mcpId: string,
      name: string,
      args: Record<string, unknown>,
    ) => {
      return ipcRenderer.invoke(CALL_MCP_TOOL_CHANNEL, {
        mcpId,
        name,
        args,
      });
    },

    openUserDataMcpJsonFile: () => {
      return ipcRenderer.invoke(OPEN_USER_DATA_MCP_JSON_FILE_CHANNEL);
    },

    downloadMcpZip: (mcpId: string) => {
      return ipcRenderer.invoke(DOWNLOAD_MCP_ZIP_CHANNEL, mcpId);
    },

    showFileInFolder: (path: string) => {
      return ipcRenderer.invoke(SHOW_FILE_IN_FOLDER_CHANNEL, path);
    },
  });
}
