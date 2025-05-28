import { ipcMain } from "electron";
import { UPDATE_CHECK_CHANNEL, UPDATE_INSTALL_CHANNEL } from "./update-channels";
import { autoUpdaterService } from "../../auto-updater";

export function addUpdateEventListeners() {
  // Manual update check
  ipcMain.handle(UPDATE_CHECK_CHANNEL, () => {
    autoUpdaterService.checkForUpdates();
  });

  // Install update and restart
  ipcMain.handle(UPDATE_INSTALL_CHANNEL, () => {
    autoUpdaterService.quitAndInstall();
  });
} 