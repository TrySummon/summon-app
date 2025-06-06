import { contextBridge, ipcRenderer } from "electron";
import {
  UPDATE_CHECK_CHANNEL,
  UPDATE_INSTALL_CHANNEL,
  UPDATE_STATUS_CHANNEL,
} from "./update-channels";

export function exposeUpdateContext() {
  try {
    contextBridge.exposeInMainWorld("updater", {
      // Check for updates manually
      checkForUpdates: () => ipcRenderer.invoke(UPDATE_CHECK_CHANNEL),

      // Install update and restart
      installUpdate: () => ipcRenderer.invoke(UPDATE_INSTALL_CHANNEL),

      // Listen for update status messages
      onUpdateStatus: (callback: (status: string) => void) => {
        ipcRenderer.on(
          UPDATE_STATUS_CHANNEL,
          (_event: Electron.IpcRendererEvent, status: string) =>
            callback(status),
        );
      },

      // Remove update status listener
      removeUpdateStatusListener: () => {
        ipcRenderer.removeAllListeners(UPDATE_STATUS_CHANNEL);
      },
    });
  } catch (error) {
    console.error("Failed to expose update context:", error);
  }
}
