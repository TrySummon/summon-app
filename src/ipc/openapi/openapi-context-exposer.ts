import { contextBridge, ipcRenderer } from "electron";
import {
  IMPORT_API_CHANNEL,
  LIST_APIS_CHANNEL,
  GET_API_CHANNEL,
  RENAME_API_CHANNEL,
  DELETE_API_CHANNEL,
} from "./openapi-channels";

export function exposeOpenApiContext() {
  try {
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
        listApis: () => {
          return ipcRenderer.invoke(LIST_APIS_CHANNEL);
        },
        getApi: (id: string) => {
          return ipcRenderer.invoke(GET_API_CHANNEL, id);
        },
        renameApi: (id: string, newName: string) => {
          return ipcRenderer.invoke(RENAME_API_CHANNEL, { id, newName });
        },
        deleteApi: (id: string) => {
          return ipcRenderer.invoke(DELETE_API_CHANNEL, id);
        },
      },
    });
  } catch (error) {
    console.error("Failed to expose openapi context:", error);
  }
}
