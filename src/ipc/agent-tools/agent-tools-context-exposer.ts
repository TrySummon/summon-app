import { contextBridge, ipcRenderer } from "electron";
import {
  LIST_APIS_CHANNEL,
  SEARCH_API_ENDPOINTS_CHANNEL,
  OPTIMISE_TOOL_SIZE_CHANNEL,
  OPTIMISE_TOOL_SELECTION_CHANNEL,
} from "./agent-tools-channels";
import {
  OptimiseToolSelectionRequest,
  OptimiseToolSizeRequest,
  SearchApiEndpointsRequest,
} from "./agent-tools-listeners";

export function exposeAgentToolsContext() {
  try {
    contextBridge.exposeInMainWorld("agentTools", {
      listApis: () => {
        return ipcRenderer.invoke(LIST_APIS_CHANNEL);
      },

      searchApiEndpoints: (args: SearchApiEndpointsRequest) => {
        return ipcRenderer.invoke(SEARCH_API_ENDPOINTS_CHANNEL, args);
      },

      optimiseToolSize: (args: OptimiseToolSizeRequest) => {
        return ipcRenderer.invoke(OPTIMISE_TOOL_SIZE_CHANNEL, args);
      },

      optimiseToolSelection: (args: OptimiseToolSelectionRequest) => {
        return ipcRenderer.invoke(OPTIMISE_TOOL_SELECTION_CHANNEL, args);
      },
    });
  } catch (error) {
    console.error("Failed to expose agent tools context:", error);
  }
}
