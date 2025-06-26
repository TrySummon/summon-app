import { contextBridge, ipcRenderer } from "electron";
import {
  LIST_APIS_CHANNEL,
  SEARCH_API_ENDPOINTS_CHANNEL,
  READ_API_ENDPOINTS_CHANNEL,
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

      readApiEndpoints: (
        apiId: string,
        endpoints: Array<{ path: string; method: string }>,
      ) => {
        return ipcRenderer.invoke(READ_API_ENDPOINTS_CHANNEL, {
          apiId,
          endpoints,
        });
      },
    });
  } catch (error) {
    console.error("Failed to expose agent tools context:", error);
  }
}
