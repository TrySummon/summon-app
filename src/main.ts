import { initSentry } from "./lib/sentry";
initSentry();

import { app, BrowserWindow, Menu, MenuItem, shell } from "electron";
import started from "electron-squirrel-startup";
if (started) {
  app.quit();
}

// Handle single instance lock to prevent crashes when multiple instances are opened
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // If we didn't get the lock, quit this instance
  app.quit();
} else {
  // If we got the lock, handle the second-instance event
  app.on("second-instance", () => {
    // Someone tried to run a second instance, focus our window instead
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

import fixPath from "fix-path";
import registerListeners from "./ipc/listeners-register";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { mcpDb } from "@/lib/db/mcp-db";
import { startMcpServer } from "@/lib/mcp";
import { connectAllExternalMcps, stopExternalMcp } from "@/lib/external-mcp";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp/external-mcp-channels";
import { runningMcpServers } from "@/lib/mcp/state";
import log from "electron-log/main";

import { updateElectronApp } from "update-electron-app";
import { workspaceDb } from "./lib/db/workspace-db";

// These are defined by Vite during build
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 768,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload: preload,
    },
    titleBarStyle: "hidden",
  });
  registerListeners(mainWindow);

  // Handle links with target='_blank' or with rel='external' attribute
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open all external links in the default browser
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
  return mainWindow;
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    log.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    log.error("Failed to install extensions");
  }
}

app
  .whenReady()
  .then(createWindow)
  .then(installExtensions)
  .then(ensureMcpJsonFiles)
  .then(watchAllMcpJsonFiles)
  .then(startAllMcpServers)
  .then(async () => {
    const results = await connectAllExternalMcps();
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.webContents.send(
        EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
        results,
      );
    }

    if (app.isPackaged) {
      log.log("App is packaged. Initializing auto-updater.");
      try {
        updateElectronApp({
          updateInterval: "1 hour",
          logger: log,
        });
        log.log("Auto-updater initialized.");
      } catch (error) {
        log.error("Failed to initialize auto-updater:", error);
      }
    } else {
      log.log(
        "App is not packaged (dev or test environment). Skipping auto-updater initialization.",
      );
    }
  });

app.whenReady().then(async () => {
  fixPath();
  const appDataDir = app.getPath("userData");

  // Get the current application menu
  const currentMenu = Menu.getApplicationMenu();

  // Find the Help menu in the current menu
  const helpMenu = currentMenu?.items.find(
    (item) => item.role === "help" || item.label === "Help",
  );

  if (helpMenu && helpMenu.submenu) {
    // Add a separator and our custom menu items to the Help submenu
    helpMenu.submenu.append(new MenuItem({ type: "separator" }));
    helpMenu.submenu.append(
      new MenuItem({
        label: "Open App Data Folder",
        click: () => {
          shell.openPath(appDataDir);
        },
      }),
    );
    helpMenu.submenu.append(
      new MenuItem({
        label: "Open Workspace Data Folder",
        click: async () => {
          try {
            const workspace = await workspaceDb.getCurrentWorkspace();
            const workspaceDir = workspaceDb.getWorkspaceDataDir(workspace.id);
            shell.openPath(workspaceDir);
          } catch (error) {
            log.error("Failed to open API data folder:", error);
          }
        },
      }),
    );
    helpMenu.submenu.append(
      new MenuItem({
        label: "Open Log Folder",
        click: () => {
          const logFile = log.transports.file.getFile();
          const logDir = path.dirname(logFile.path);
          shell.openPath(logDir);
        },
      }),
    );

    // Update the application menu
    Menu.setApplicationMenu(currentMenu);
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Ensure mcp.json files exist for all workspaces
async function ensureMcpJsonFiles(): Promise<void> {
  try {
    // Initialize workspace system to ensure default workspace exists
    await workspaceDb.initializeWorkspaces();

    // Get all workspaces
    const workspaces = await workspaceDb.listWorkspaces();

    for (const workspace of workspaces) {
      const workspaceDataDir = workspaceDb.getWorkspaceDataDir(workspace.id);
      const mcpJsonPath = path.join(workspaceDataDir, "mcp.json");

      try {
        // Check if the file exists
        await fsPromises.access(mcpJsonPath, fs.constants.F_OK);
        log.info(
          `mcp.json file already exists for workspace ${workspace.name} (${workspace.id})`,
        );
      } catch {
        // File doesn't exist, create it with default content
        const defaultContent = {
          mcpServers: {},
        };
        try {
          // Ensure workspace directory exists first
          await fsPromises.mkdir(workspaceDataDir, { recursive: true });

          await fsPromises.writeFile(
            mcpJsonPath,
            JSON.stringify(defaultContent, null, 2),
            "utf8",
          );
          log.info(
            `Created default mcp.json file for workspace ${workspace.name} (${workspace.id})`,
          );
        } catch (writeError) {
          log.error(
            `Failed to create mcp.json file for workspace ${workspace.id}:`,
            writeError,
          );
        }
      }
    }
  } catch (error) {
    log.error("Error ensuring mcp.json files:", error);
  }
}

// Map to store file watchers for cleanup
const mcpFileWatchers = new Map<string, fs.FSWatcher>();

// Watch for changes to all mcp.json files across workspaces
async function watchAllMcpJsonFiles(): Promise<void> {
  try {
    // Clean up existing watchers
    for (const [workspaceId, watcher] of mcpFileWatchers.entries()) {
      try {
        watcher.close();
        log.info(
          `Closed existing mcp.json watcher for workspace ${workspaceId}`,
        );
      } catch (error) {
        log.error(`Error closing watcher for workspace ${workspaceId}:`, error);
      }
    }
    mcpFileWatchers.clear();

    // Get all workspaces
    const workspaces = await workspaceDb.listWorkspaces();

    for (const workspace of workspaces) {
      const workspaceDataDir = workspaceDb.getWorkspaceDataDir(workspace.id);
      const mcpJsonPath = path.join(workspaceDataDir, "mcp.json");

      try {
        // Check if file exists before watching
        await fsPromises.access(mcpJsonPath, fs.constants.F_OK);

        const watcher = fs.watch(mcpJsonPath, async (eventType) => {
          if (eventType === "change") {
            log.info(
              `mcp.json file changed for workspace ${workspace.name} (${workspace.id}), checking if current workspace...`,
            );

            try {
              // Check if this is the current workspace
              const currentWorkspace = await workspaceDb.getCurrentWorkspace();

              if (currentWorkspace.id === workspace.id) {
                log.info(
                  "Changed mcp.json belongs to current workspace, reloading external MCP servers...",
                );

                // Get the current list of external MCP servers before updating
                const currentExternalMcpIds = Object.keys(
                  runningMcpServers,
                ).filter((id) => runningMcpServers[id].isExternal);

                // Connect to all external MCPs based on the updated configuration
                const results = await connectAllExternalMcps();

                // Clean up state for external MCPs that are no longer in the file
                const newExternalMcpIds = Object.keys(results);
                const removedMcpIds = currentExternalMcpIds.filter(
                  (id) => !newExternalMcpIds.includes(id),
                );

                // Stop and clean up removed MCPs
                if (removedMcpIds.length > 0) {
                  log.info(
                    `Cleaning up ${removedMcpIds.length} external MCP servers that are no longer in the config...`,
                  );

                  for (const mcpId of removedMcpIds) {
                    try {
                      await stopExternalMcp(mcpId);
                      log.info(`Stopped external MCP server: ${mcpId}`);
                      // Remove from runningMcpServers after stopping
                      delete runningMcpServers[mcpId];
                    } catch (stopError) {
                      log.error(
                        `Failed to stop external MCP server ${mcpId}:`,
                        stopError,
                      );
                    }
                  }
                }

                // Notify the renderer process about the update
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                  mainWindow.webContents.send(
                    EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
                    results,
                  );
                }
              } else {
                log.info(
                  `Changed mcp.json belongs to workspace ${workspace.name} (${workspace.id}), not current workspace. Ignoring.`,
                );
              }
            } catch (error) {
              log.error(
                `Error processing mcp.json changes for workspace ${workspace.id}:`,
                error,
              );
            }
          }
        });

        // Handle watcher errors
        watcher.on("error", (error) => {
          log.error(
            `Error watching mcp.json file for workspace ${workspace.id}:`,
            error,
          );
          // Remove failed watcher from map
          mcpFileWatchers.delete(workspace.id);
        });

        // Store watcher for cleanup later
        mcpFileWatchers.set(workspace.id, watcher);
        log.info(
          `Watching mcp.json file for workspace ${workspace.name} (${workspace.id})`,
        );
      } catch (error) {
        log.error(
          `Failed to set up watcher for workspace ${workspace.id}:`,
          error,
        );
      }
    }

    log.info(
      `Set up ${mcpFileWatchers.size} mcp.json file watchers across all workspaces`,
    );
  } catch (error) {
    log.error("Failed to set up watchers for mcp.json files:", error);
  }
}

// Helper function to refresh watchers when workspaces change
export const refreshMcpJsonWatchers = async (): Promise<void> => {
  log.info("Refreshing mcp.json watchers for all workspaces...");
  await ensureMcpJsonFiles();
  await watchAllMcpJsonFiles();
};

// Start all MCP servers when the app starts
export async function startAllMcpServers(): Promise<void> {
  try {
    log.info("Starting all MCP servers...");
    const mcps = await mcpDb.listMcps();

    for (const mcp of mcps) {
      log.info(`Starting MCP server: ${mcp.id}`);
      await startMcpServer(mcp.id).catch((error: Error) => {
        log.error(`Failed to start MCP server ${mcp.id}:`, error);
      });
    }

    log.info("All MCP servers started");
  } catch (error) {
    log.error(
      "Error starting MCP servers:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
