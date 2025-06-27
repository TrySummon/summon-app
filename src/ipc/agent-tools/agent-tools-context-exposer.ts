import { contextBridge, ipcRenderer } from "electron";
import {
  LIST_APIS_CHANNEL,
  SEARCH_API_ENDPOINTS_CHANNEL,
  OPTIMISE_TOOL_DEF_CHANNEL,
} from "./agent-tools-channels";

export function exposeAgentToolsContext() {
  try {
    contextBridge.exposeInMainWorld("agentTools", {
      listApis: () => {
        return ipcRenderer.invoke(LIST_APIS_CHANNEL);
      },

      searchApiEndpoints: (args: {
        apiId: string;
        query?: string;
        tags?: string[];
      }) => {
        return ipcRenderer.invoke(SEARCH_API_ENDPOINTS_CHANNEL, args);
      },

      optimiseToolDef: (args: {
        apiId: string;
        mcpId: string;
        toolName: string;
      }) => {
        return ipcRenderer.invoke(OPTIMISE_TOOL_DEF_CHANNEL, args);
      },
    });
  } catch (error) {
    console.error("Failed to expose agent tools context:", error);
  }
}
