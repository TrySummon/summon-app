import { contextBridge, ipcRenderer } from "electron";
import {
  LIST_APIS_CHANNEL,
  LIST_API_ENDPOINTS_CHANNEL,
  READ_API_ENDPOINTS_CHANNEL,
} from "./agent-tools-channels";

export function exposeAgentToolsContext() {
  try {
    contextBridge.exposeInMainWorld("agentTools", {
      listApis: () => {
        return ipcRenderer.invoke(LIST_APIS_CHANNEL);
      },

      listApiEndpoints: (apiId: string) => {
        return ipcRenderer.invoke(LIST_API_ENDPOINTS_CHANNEL, { apiId });
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
