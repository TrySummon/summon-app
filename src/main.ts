import { app, BrowserWindow, Menu, MenuItem, shell } from "electron";
import fixPath from "fix-path";
import registerListeners from "./helpers/ipc/listeners-register";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { getApiDataDir } from "./helpers/db/api-db";
import { getMcpDataDir, getMcpImplDir, mcpDb } from "./helpers/db/mcp-db";
import { startMcpServer } from "./helpers/mcp";
import {
  connectAllExternalMcps,
  stopExternalMcp,
} from "./helpers/external-mcp";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "./helpers/ipc/external-mcp/external-mcp-channels";
import { runningMcpServers } from "./helpers/mcp/state";

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
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    console.log(`Extensions installed successfully: ${result.name}`);
  } catch {
    console.error("Failed to install extensions");
  }
}

app
  .whenReady()
  .then(createWindow)
  .then(installExtensions)
  .then(ensureMcpJsonFile)
  .then(watchMcpJsonFile)
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
  });

app.whenReady().then(() => {
  fixPath();
  const appDataDir = app.getPath("userData");
  const apiDataDir = getApiDataDir();
  const mcpDataDir = getMcpDataDir();
  const mcpImplDir = getMcpImplDir();
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
        label: "Open Api Data Folder",
        click: () => {
          shell.openPath(apiDataDir);
        },
      }),
    );
    helpMenu.submenu.append(
      new MenuItem({
        label: "Open MCP Data Folder",
        click: () => {
          shell.openPath(mcpDataDir);
        },
      }),
    );
    helpMenu.submenu.append(
      new MenuItem({
        label: "Open MCP Implementation Folder",
        click: () => {
          shell.openPath(mcpImplDir);
        },
      }),
    );

    // Update the application menu
    Menu.setApplicationMenu(currentMenu);
  }
});

// Get the path to the mcp.json file in the user data directory
const getMcpJsonFilePath = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "mcp.json");
};

// Ensure the mcp.json file exists with default content
async function ensureMcpJsonFile(): Promise<void> {
  const mcpJsonPath = getMcpJsonFilePath();
  try {
    // Check if the file exists
    await fsPromises.access(mcpJsonPath, fs.constants.F_OK);
    console.info("mcp.json file already exists");
  } catch {
    // File doesn't exist, create it with default content
    const defaultContent = {
      mcpServers: {},
    };
    try {
      await fsPromises.writeFile(
        mcpJsonPath,
        JSON.stringify(defaultContent, null, 2),
        "utf8",
      );
      console.info("Created default mcp.json file");
    } catch (writeError) {
      console.error("Failed to create mcp.json file:", writeError);
    }
  }
}

// Watch for changes to the mcp.json file
function watchMcpJsonFile(): void {
  const mcpJsonPath = getMcpJsonFilePath();
  try {
    const watcher = fs.watch(mcpJsonPath, async (eventType) => {
      if (eventType === "change") {
        console.info("mcp.json file changed, reloading MCP servers...");
        try {
          // Get the current list of external MCP servers before updating
          const currentExternalMcpIds = Object.keys(runningMcpServers).filter(
            (id) => runningMcpServers[id].isExternal,
          );

          // Connect to all external MCPs based on the updated configuration
          const results = await connectAllExternalMcps();

          // Clean up state for external MCPs that are no longer in the file
          const newExternalMcpIds = Object.keys(results);
          const removedMcpIds = currentExternalMcpIds.filter(
            (id) => !newExternalMcpIds.includes(id),
          );

          // Stop and clean up removed MCPs
          if (removedMcpIds.length > 0) {
            console.info(
              `Cleaning up ${removedMcpIds.length} external MCP servers that are no longer in the config...`,
            );

            for (const mcpId of removedMcpIds) {
              try {
                await stopExternalMcp(mcpId);
                console.info(`Stopped external MCP server: ${mcpId}`);
                // Remove from runningMcpServers after stopping
                delete runningMcpServers[mcpId];
              } catch (stopError) {
                console.error(
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
        } catch (error) {
          console.error("Error processing mcp.json changes:", error);
        }
      }
    });

    // Handle watcher errors
    watcher.on("error", (error) => {
      console.error("Error watching mcp.json file:", error);
    });

    console.info("Watching mcp.json file for changes");
  } catch (error) {
    console.error("Failed to set up watcher for mcp.json:", error);
  }
}

// Start all MCP servers when the app starts
async function startAllMcpServers(): Promise<void> {
  try {
    console.info("Starting all MCP servers...");
    const mcps = await mcpDb.listMcps();

    for (const mcp of mcps) {
      console.info(`Starting MCP server: ${mcp.id}`);
      await startMcpServer(mcp.id).catch((error: Error) => {
        console.error(`Failed to start MCP server ${mcp.id}:`, error);
      });
    }

    console.info("All MCP servers started");
  } catch (error) {
    console.error(
      "Error starting MCP servers:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
