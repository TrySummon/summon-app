import { ImportApiOptions } from "@/components/ImportApiDialog";
import { IMPORT_API_CHANNEL } from "./openapi-channels";

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
      }
    });
  } catch (error) {
    console.error("Failed to expose openapi context:", error);
  }
}
