import { app } from "electron";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import log from "electron-log/main";
import { generateReadableId } from "./id-generator";

export interface Workspace {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_WORKSPACE_NAME = "Workspace";
const WORKSPACES_CONFIG_FILE = "workspaces.json";
const CURRENT_WORKSPACE_FILE = "current-workspace.json";

// Get the base user data directory
export const getUserDataDir = () => {
  return app.getPath("userData");
};

// Get the workspaces directory
export const getWorkspacesDir = () => {
  return path.join(getUserDataDir(), "workspaces");
};

// Get workspace-specific data directory
export const getWorkspaceDataDir = (workspaceId: string) => {
  return path.join(getWorkspacesDir(), workspaceId);
};

// Get the file path for workspace configuration
const getWorkspacesConfigPath = () => {
  return path.join(getUserDataDir(), WORKSPACES_CONFIG_FILE);
};

// Get the file path for current workspace tracking
const getCurrentWorkspacePath = () => {
  return path.join(getUserDataDir(), CURRENT_WORKSPACE_FILE);
};

// Ensure workspace directories exist
const ensureWorkspaceDir = async (workspaceId: string) => {
  const workspaceDir = getWorkspaceDataDir(workspaceId);
  try {
    await fs.mkdir(workspaceDir, { recursive: true });

    // Create subdirectories for each data type
    await fs.mkdir(path.join(workspaceDir, "api-data"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "datasets"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "mcp-data"), { recursive: true });
    await fs.mkdir(path.join(workspaceDir, "mcp-impl"), { recursive: true });

    // Create default mcp.json file for external MCP servers
    const mcpJsonPath = path.join(workspaceDir, "mcp.json");
    const defaultMcpContent = {
      mcpServers: {},
    };

    try {
      // Only create if it doesn't exist
      await fs.access(mcpJsonPath);
      log.info(`mcp.json already exists for workspace ${workspaceId}`);
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(
        mcpJsonPath,
        JSON.stringify(defaultMcpContent, null, 2),
        "utf8",
      );
      log.info(`Created default mcp.json for workspace ${workspaceId}`);
    }
  } catch (error) {
    log.error(
      `Failed to create workspace directory for ${workspaceId}:`,
      error,
    );
    throw error;
  }
};

// Load workspaces configuration
const loadWorkspacesConfig = async (): Promise<Workspace[]> => {
  try {
    const configPath = getWorkspacesConfigPath();
    if (fsSync.existsSync(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    log.error("Error loading workspaces configuration:", error);
  }
  return [];
};

// Save workspaces configuration
const saveWorkspacesConfig = async (workspaces: Workspace[]) => {
  try {
    const configPath = getWorkspacesConfigPath();
    await fs.writeFile(configPath, JSON.stringify(workspaces, null, 2));
  } catch (error) {
    log.error("Error saving workspaces configuration:", error);
    throw error;
  }
};

// Load current workspace ID
const loadCurrentWorkspaceId = async (): Promise<string | null> => {
  try {
    const currentPath = getCurrentWorkspacePath();
    if (fsSync.existsSync(currentPath)) {
      const content = await fs.readFile(currentPath, "utf-8");
      const data = JSON.parse(content);
      return data.currentWorkspaceId;
    }
  } catch (error) {
    log.error("Error loading current workspace:", error);
  }
  return null;
};

// Save current workspace ID
const saveCurrentWorkspaceId = async (workspaceId: string) => {
  try {
    const currentPath = getCurrentWorkspacePath();
    await fs.writeFile(
      currentPath,
      JSON.stringify({ currentWorkspaceId: workspaceId }, null, 2),
    );
  } catch (error) {
    log.error("Error saving current workspace:", error);
    throw error;
  }
};

// Copy directory contents recursively
const copyDirectoryContents = async (source: string, target: string) => {
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyDirectoryContents(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
};

// Fix API file originalFilePath references after migration
const fixApiFilePaths = async (workspaceId: string) => {
  const userDataDir = getUserDataDir();
  const workspaceDir = getWorkspaceDataDir(workspaceId);
  const apiDataPath = path.join(workspaceDir, "api-data");

  try {
    const files = await fs.readdir(apiDataPath);
    // Filter only API metadata files (not the original spec files which end with -original.json)
    const apiFiles = files.filter(
      (file) => file.endsWith(".json") && !file.endsWith("-original.json"),
    );

    for (const file of apiFiles) {
      try {
        const filePath = path.join(apiDataPath, file);
        const fileContent = await fs.readFile(filePath, "utf-8");
        const apiData = JSON.parse(fileContent);

        // Check if originalFilePath needs to be updated
        if (
          apiData.originalFilePath &&
          apiData.originalFilePath.includes(userDataDir)
        ) {
          // Update the path from old root location to new workspace location
          const oldPath = apiData.originalFilePath;
          const relativePath = path.relative(
            path.join(userDataDir, "api-data"),
            oldPath,
          );
          const newPath = path.join(apiDataPath, relativePath);

          apiData.originalFilePath = newPath;

          // Write the updated API data back
          await fs.writeFile(filePath, JSON.stringify(apiData, null, 2));
          log.info(
            `Updated originalFilePath for ${file}: ${oldPath} -> ${newPath}`,
          );
        }
      } catch (error) {
        log.error(`Error fixing API file paths for ${file}:`, error);
      }
    }
  } catch (error) {
    log.info("No API data to fix or error occurred:", error);
  }
};

// Migrate existing data from root user data directory to workspace
const migrateExistingData = async (workspaceId: string) => {
  const userDataDir = getUserDataDir();
  const workspaceDir = getWorkspaceDataDir(workspaceId);

  // List of directories/files to migrate
  const itemsToMigrate = [
    { from: "datasets", to: "datasets", isDirectory: true },
    { from: "api-data", to: "api-data", isDirectory: true },
    { from: "mcp-data", to: "mcp-data", isDirectory: true },
    { from: "mcp-impl", to: "mcp-impl", isDirectory: true },
    { from: "mcp.json", to: "mcp.json", isDirectory: false },
  ];

  for (const item of itemsToMigrate) {
    const sourcePath = path.join(userDataDir, item.from);
    const targetPath = path.join(workspaceDir, item.to);

    try {
      // Check if source exists
      await fs.access(sourcePath);

      if (item.isDirectory) {
        // Check if source directory has contents
        const entries = await fs.readdir(sourcePath);
        if (entries.length === 0) {
          log.info(
            `Source directory ${item.from} is empty, skipping migration`,
          );
          continue;
        }

        // Copy directory contents to target
        await copyDirectoryContents(sourcePath, targetPath);
        log.info(
          `Migrated directory contents from ${item.from} to workspace ${workspaceId}`,
        );

        // Remove source directory after successful copy
        await fs.rm(sourcePath, { recursive: true, force: true });
        log.info(`Removed source directory ${item.from} after migration`);
      } else {
        // For files, check if target already exists
        try {
          await fs.access(targetPath);
          log.info(`Target file ${item.to} already exists, skipping migration`);
          continue;
        } catch {
          // Target doesn't exist, proceed with migration
        }

        // Copy file
        await fs.copyFile(sourcePath, targetPath);
        log.info(`Migrated file ${item.from} to workspace ${workspaceId}`);

        // Remove source file after successful copy
        await fs.unlink(sourcePath);
        log.info(`Removed source file ${item.from} after migration`);
      }
    } catch (error) {
      // Source doesn't exist or migration failed, continue with next item
      log.info(`No ${item.from} to migrate or migration failed:`, error);
    }
  }

  // Fix API file originalFilePath references after migrating api-data
  await fixApiFilePaths(workspaceId);
};

// Initialize workspace system (create default workspace if none exist)
const initializeWorkspaces = async (): Promise<Workspace> => {
  const workspaces = await loadWorkspacesConfig();

  // If no workspaces exist, create the default one and migrate existing data
  if (workspaces.length === 0) {
    const defaultWorkspace = await createWorkspace(
      DEFAULT_WORKSPACE_NAME,
      true,
    );

    // Migrate existing data from root user data directory
    await migrateExistingData(defaultWorkspace.id);

    await setCurrentWorkspace(defaultWorkspace.id);
    return defaultWorkspace;
  }

  // Ensure default workspace exists
  let defaultWorkspace = workspaces.find((w) => w.isDefault);
  if (!defaultWorkspace) {
    // Mark the first workspace as default if none is marked
    defaultWorkspace = workspaces[0];
    defaultWorkspace.isDefault = true;
    await saveWorkspacesConfig(workspaces);
  }

  // Ensure current workspace is set
  const currentWorkspaceId = await loadCurrentWorkspaceId();
  if (
    !currentWorkspaceId ||
    !workspaces.find((w) => w.id === currentWorkspaceId)
  ) {
    await setCurrentWorkspace(defaultWorkspace.id);
  }

  return defaultWorkspace;
};

// Create a new workspace
const createWorkspace = async (
  name: string,
  isDefault: boolean = false,
): Promise<Workspace> => {
  const workspaces = await loadWorkspacesConfig();

  // If setting as default, unmark all other workspaces as default
  if (isDefault) {
    workspaces.forEach((w) => (w.isDefault = false));
  }

  const workspace: Workspace = {
    id: generateReadableId(name),
    name: name.trim(),
    isDefault,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Create workspace directory structure
  await ensureWorkspaceDir(workspace.id);

  // Add to configuration
  workspaces.push(workspace);
  await saveWorkspacesConfig(workspaces);

  return workspace;
};

// List all workspaces
const listWorkspaces = async (): Promise<Workspace[]> => {
  return await loadWorkspacesConfig();
};

// Get workspace by ID
const getWorkspaceById = async (id: string): Promise<Workspace | null> => {
  const workspaces = await loadWorkspacesConfig();
  return workspaces.find((w) => w.id === id) || null;
};

// Update workspace
const updateWorkspace = async (
  id: string,
  updates: Partial<Pick<Workspace, "name">>,
): Promise<boolean> => {
  const workspaces = await loadWorkspacesConfig();
  const workspaceIndex = workspaces.findIndex((w) => w.id === id);

  if (workspaceIndex === -1) {
    return false;
  }

  workspaces[workspaceIndex] = {
    ...workspaces[workspaceIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveWorkspacesConfig(workspaces);
  return true;
};

// Delete workspace (cannot delete default workspace if it's the only one)
const deleteWorkspace = async (id: string): Promise<boolean> => {
  const workspaces = await loadWorkspacesConfig();
  const workspace = workspaces.find((w) => w.id === id);

  if (!workspace) {
    return false;
  }

  // Cannot delete if it's the only workspace
  if (workspaces.length === 1) {
    return false;
  }

  // Remove from configuration
  const updatedWorkspaces = workspaces.filter((w) => w.id !== id);

  // If we're deleting the current workspace, switch to default
  const currentWorkspaceId = await loadCurrentWorkspaceId();
  if (currentWorkspaceId === id) {
    const defaultWorkspace =
      updatedWorkspaces.find((w) => w.isDefault) || updatedWorkspaces[0];
    await setCurrentWorkspace(defaultWorkspace.id);
  }

  await saveWorkspacesConfig(updatedWorkspaces);

  // Remove workspace directory
  try {
    const workspaceDir = getWorkspaceDataDir(id);
    await fs.rm(workspaceDir, { recursive: true, force: true });
  } catch (error) {
    log.error(`Error removing workspace directory for ${id}:`, error);
  }

  return true;
};

// Get current workspace
const getCurrentWorkspace = async (): Promise<Workspace> => {
  // Initialize workspaces if needed
  await initializeWorkspaces();

  const currentWorkspaceId = await loadCurrentWorkspaceId();
  if (currentWorkspaceId) {
    const workspace = await getWorkspaceById(currentWorkspaceId);
    if (workspace) {
      return workspace;
    }
  }

  // Fallback to default workspace
  const workspaces = await loadWorkspacesConfig();
  const defaultWorkspace = workspaces.find((w) => w.isDefault) || workspaces[0];
  await setCurrentWorkspace(defaultWorkspace.id);
  return defaultWorkspace;
};

// Set current workspace
const setCurrentWorkspace = async (workspaceId: string): Promise<boolean> => {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) {
    return false;
  }

  await saveCurrentWorkspaceId(workspaceId);
  return true;
};

export const workspaceDb = {
  initializeWorkspaces,
  createWorkspace,
  listWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getCurrentWorkspace,
  setCurrentWorkspace,
  getWorkspaceDataDir,
};
