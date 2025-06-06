import { autoUpdater, UpdateInfo } from "electron-updater";
import { app, dialog, BrowserWindow } from "electron";

// Utility function to check if we're in development
function isDev(): boolean {
  return process.env.NODE_ENV === "development" || !app.isPackaged;
}

class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Configure auto-updater
    this.configureAutoUpdater();
  }

  private configureAutoUpdater() {
    // Don't check for updates in development
    if (isDev()) {
      autoUpdater.updateConfigPath = null;
      return;
    }

    // Configure update server
    // For GitHub releases, this is automatic if you have a repository field in package.json
    // For custom server, set the feed URL:
    // autoUpdater.setFeedURL({
    //   provider: "generic",
    //   url: "https://your-update-server.com/releases"
    // });

    // Auto-updater events
    autoUpdater.on("checking-for-update", () => {
      console.log("Checking for update...");
      this.sendStatusToWindow("Checking for update...");
    });

    autoUpdater.on("update-available", (info) => {
      console.log("Update available:", info);
      this.sendStatusToWindow("Update available");

      // Show update notification
      this.showUpdateNotification(info);
    });

    autoUpdater.on("update-not-available", (info) => {
      console.log("Update not available:", info);
      this.sendStatusToWindow("Update not available");
    });

    autoUpdater.on("error", (err) => {
      console.error("Update error:", err);
      this.sendStatusToWindow("Error in auto-updater: " + err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + " - Downloaded " + progressObj.percent + "%";
      log_message =
        log_message +
        " (" +
        progressObj.transferred +
        "/" +
        progressObj.total +
        ")";
      console.log(log_message);
      this.sendStatusToWindow(log_message);
    });

    autoUpdater.on("update-downloaded", (info) => {
      console.log("Update downloaded:", info);
      this.sendStatusToWindow("Update downloaded");

      // Show restart dialog
      this.showRestartDialog();
    });
  }

  public setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  public checkForUpdates() {
    if (isDev()) {
      console.log("Skipping update check in development mode");
      return;
    }

    autoUpdater.checkForUpdatesAndNotify();
  }

  public startPeriodicUpdateCheck(intervalMinutes: number = 60) {
    if (isDev()) {
      console.log("Skipping periodic update check in development mode");
      return;
    }

    // Clear existing interval
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    // Set up periodic check
    this.updateCheckInterval = setInterval(
      () => {
        this.checkForUpdates();
      },
      intervalMinutes * 60 * 1000,
    );

    // Check immediately
    this.checkForUpdates();
  }

  public stopPeriodicUpdateCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  private sendStatusToWindow(message: string) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send("update-status", message);
    }
  }

  private async showUpdateNotification(info: UpdateInfo) {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available!`,
      detail:
        "The update will be downloaded in the background. You'll be notified when it's ready to install.",
      buttons: ["Dismiss", "Download Now", "Skip This Version"],
      defaultId: 1,
      cancelId: 2,
    });

    if (response.response === 1) {
      // Download now
      autoUpdater.downloadUpdate();
    } else if (response.response === 2) {
      // Skip this version (you might want to store this preference)
      console.log("User chose to skip version:", info.version);
    }
  }

  private async showRestartDialog() {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: "info",
      title: "Update Ready",
      message: "Update downloaded successfully!",
      detail: "The application will restart to apply the update.",
      buttons: ["Restart Now", "Restart Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      // Restart now
      autoUpdater.quitAndInstall();
    }
  }

  public quitAndInstall() {
    autoUpdater.quitAndInstall();
  }
}

export const autoUpdaterService = new AutoUpdaterService();
export default autoUpdaterService;
