import { ImportApiOptions } from "@/components/ImportApiDialog";
import { 
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  UPDATE_API_CHANNEL,
  DELETE_API_CHANNEL,
  LIST_API_TOOLS_CHANNEL,
  GET_API_TOOL_CHANNEL,
  UPDATE_API_TOOL_CHANNEL,
  DELETE_API_TOOL_CHANNEL
} from "./openapi-channels";
import { API, McpToolDefinition } from "@/helpers/openapi/types";

export function exposeOpenApiContext() {
  try {
    const { contextBridge, ipcRenderer } = window.require("electron");
    
    contextBridge.exposeInMainWorld("electron", {
      ...window.electron,
      importApi: {
        import: (file: File, options: ImportApiOptions) => {
          // Convert File to buffer for IPC transfer
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const buffer = Buffer.from(reader.result as ArrayBuffer);
                const result = await ipcRenderer.invoke(IMPORT_API_CHANNEL, {
                  filename: file.name,
                  buffer,
                  options
                });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsArrayBuffer(file);
          });
        }
      },
      apiDb: {
        // API CRUD operations
        listApis: () => ipcRenderer.invoke(LIST_APIS_CHANNEL),
        getApi: (id: string) => ipcRenderer.invoke(GET_API_CHANNEL, id),
        updateApi: (id: string, api: API) => ipcRenderer.invoke(UPDATE_API_CHANNEL, { id, api }),
        deleteApi: (id: string) => ipcRenderer.invoke(DELETE_API_CHANNEL, id),
        
        // API Tool CRUD operations
        listApiTools: (apiId: string) => ipcRenderer.invoke(LIST_API_TOOLS_CHANNEL, apiId),
        getApiTool: (apiId: string, toolName: string) => 
          ipcRenderer.invoke(GET_API_TOOL_CHANNEL, { apiId, toolName }),
        updateApiTool: (apiId: string, toolName: string, tool: McpToolDefinition) => 
          ipcRenderer.invoke(UPDATE_API_TOOL_CHANNEL, { apiId, toolName, tool }),
        deleteApiTool: (apiId: string, toolName: string) => 
          ipcRenderer.invoke(DELETE_API_TOOL_CHANNEL, { apiId, toolName })
      }
    });
  } catch (error) {
    console.error("Failed to expose openapi context:", error);
  }
}
