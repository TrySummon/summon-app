import { app, BrowserWindow, Menu, MenuItem, shell } from "electron";
import registerListeners from "./helpers/ipc/listeners-register";
// "electron-squirrel-startup" seems broken when packaging with vite
//import started from "electron-squirrel-startup";
import path from "path";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import { getApiDataDir } from "./helpers/db/api-db";
import { getMcpDataDir, getMcpImplDir, mcpDb } from "./helpers/db/mcp-db";
import { startMcpServer } from "./helpers/mcp";

// These are defined by Vite during build
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string | undefined;

const inDevelopment = process.env.NODE_ENV === "development";

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
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
    return { action: 'deny' };
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

app.whenReady().then(createWindow).then(installExtensions).then(startAllMcpServers);

app.whenReady().then(() => {
  const apiDataDir = getApiDataDir();
  const mcpDataDir = getMcpDataDir();
  const mcpImplDir = getMcpImplDir();
  // Get the current application menu
  const currentMenu = Menu.getApplicationMenu();
  
  // Find the Help menu in the current menu
  const helpMenu = currentMenu?.items.find(item => item.role === 'help' || item.label === 'Help');
  
  if (helpMenu && helpMenu.submenu) {
    // Add a separator and our custom menu items to the Help submenu
    helpMenu.submenu.append(new MenuItem({ type: 'separator' }));
    helpMenu.submenu.append(new MenuItem({
      label: 'Open Api Data Folder',
      click: () => {
        shell.openPath(apiDataDir);
      }
    }));
    helpMenu.submenu.append(new MenuItem({
      label: 'Open MCP Data Folder',
      click: () => {
        shell.openPath(mcpDataDir);
      }
    }));
    helpMenu.submenu.append(new MenuItem({
      label: 'Open MCP Implementation Folder',
      click: () => {
        shell.openPath(mcpImplDir);
      }
    }));
    
    // Update the application menu
    Menu.setApplicationMenu(currentMenu);
  }
});

// Start all MCP servers when the app starts
async function startAllMcpServers(): Promise<void> {
  try {
    console.info('Starting all MCP servers...');
    const mcps = await mcpDb.listMcps();
    
    for (const mcp of mcps) {
      console.info(`Starting MCP server: ${mcp.id}`);
      startMcpServer(mcp.id).catch((error: Error) => {
        console.error(`Failed to start MCP server ${mcp.id}:`, error);
      });
    }
    
    console.info('All MCP servers started');
  } catch (error) {
    console.error('Error starting MCP servers:', error instanceof Error ? error.message : String(error));
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
