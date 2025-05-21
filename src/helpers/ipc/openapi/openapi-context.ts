import { 
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  UPDATE_API_CHANNEL,
  DELETE_API_CHANNEL,
} from "./openapi-channels";
import { OpenAPIV3 } from "openapi-types";

export function exposeOpenApiContext() {
  try {
    const { contextBridge, ipcRenderer } = window.require("electron");
    
    contextBridge.exposeInMainWorld("openapi", {
        import: (file: File) => {
          // Convert File to buffer for IPC transfer
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const buffer = Buffer.from(reader.result as ArrayBuffer);
                const result = await ipcRenderer.invoke(IMPORT_API_CHANNEL, {
                  filename: file.name,
                  buffer,
                });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsArrayBuffer(file);
          });
        },  

      db: {
        // API CRUD operations
        listApis: () => ipcRenderer.invoke(LIST_APIS_CHANNEL),
        getApi: (id: string) => ipcRenderer.invoke(GET_API_CHANNEL, id),
        updateApi: (id: string, api: OpenAPIV3.Document) => {
          // Convert the API object to a buffer
          const buffer = Buffer.from(JSON.stringify(api));
          return ipcRenderer.invoke(UPDATE_API_CHANNEL, { id, buffer });
        },
        deleteApi: (id: string) => ipcRenderer.invoke(DELETE_API_CHANNEL, id),

      }
    });
  } catch (error) {
    console.error("Failed to expose openapi context:", error);
  }
}
