import { app, safeStorage } from "electron";
import fs from "fs/promises";
import path from "path";
import { workspaceDb } from "../db/workspace-db";
import log from "electron-log";

/**
 * Get the OAuth configuration directory for external MCP servers
 */
export const getMcpOAuthDir = async (): Promise<string> => {
  try {
    const currentWorkspace = await workspaceDb.getCurrentWorkspace();
    const workspaceDataDir = workspaceDb.getWorkspaceDataDir(
      currentWorkspace.id,
    );
    return path.join(workspaceDataDir, ".oauth");
  } catch (error) {
    // Fallback to root directory if workspace system fails
    console.error(
      "Failed to get workspace for OAuth storage, falling back to root:",
      error,
    );
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, ".oauth");
  }
};

/**
 * Ensures the OAuth configuration directory exists
 */
export const ensureMcpOAuthDir = async (): Promise<void> => {
  try {
    const oauthDir = await getMcpOAuthDir();
    await fs.mkdir(oauthDir, { recursive: true });
  } catch (error) {
    log.error("Error creating OAuth config directory:", error);
    throw error;
  }
};

/**
 * Gets the file path for an OAuth config file
 */
export const getMcpOAuthFilePath = async (
  serverName: string,
  filename: string,
): Promise<string> => {
  const oauthDir = await getMcpOAuthDir();
  // Use server name as prefix to avoid conflicts
  const safeServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(oauthDir, `${safeServerName}_${filename}`);
};

/**
 * Interface for schema validation
 */
interface ValidationSchema<T> {
  parse?: (data: unknown) => T;
  parseAsync?: (data: unknown) => Promise<T>;
}

/**
 * Reads and decrypts an OAuth file
 */
export const readMcpOAuthFile = async <T>(
  serverName: string,
  filename: string,
  schema: ValidationSchema<T>,
): Promise<T | undefined> => {
  try {
    await ensureMcpOAuthDir();

    const filePath = await getMcpOAuthFilePath(serverName, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist
      return undefined;
    }

    const encryptedContent = await fs.readFile(filePath);

    // Decrypt content if using encrypted storage
    let content: string;
    if (safeStorage.isEncryptionAvailable()) {
      try {
        content = safeStorage.decryptString(encryptedContent);
      } catch {
        // Try reading as plain text (for backward compatibility or fallback)
        content = encryptedContent.toString("utf-8");
      }
    } else {
      content = encryptedContent.toString("utf-8");
    }

    // Parse content based on file extension
    let data: unknown;
    if (filename.endsWith(".json")) {
      data = JSON.parse(content);
    } else {
      data = content;
    }

    // Validate with schema
    if (schema.parseAsync) {
      return await schema.parseAsync(data);
    } else if (schema.parse) {
      return schema.parse(data);
    } else {
      return data as T;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    log.error(
      `Error reading OAuth file ${filename} for server ${serverName}:`,
      error,
    );
    return undefined;
  }
};

/**
 * Encrypts and writes an OAuth file
 */
export const writeMcpOAuthFile = async (
  serverName: string,
  filename: string,
  data: unknown,
): Promise<void> => {
  try {
    await ensureMcpOAuthDir();

    const filePath = await getMcpOAuthFilePath(serverName, filename);

    // Serialize data based on type
    let content: string;
    if (filename.endsWith(".json")) {
      content = JSON.stringify(data, null, 2);
    } else {
      content = String(data);
    }

    // Encrypt content if available
    let contentToWrite: Buffer;
    if (safeStorage.isEncryptionAvailable()) {
      contentToWrite = safeStorage.encryptString(content);
    } else {
      contentToWrite = Buffer.from(content, "utf-8");
    }

    await fs.writeFile(filePath, contentToWrite);

    log.info(
      `OAuth file ${filename} written for server ${serverName} (encrypted: ${safeStorage.isEncryptionAvailable()})`,
    );
  } catch (error) {
    log.error(
      `Error writing OAuth file ${filename} for server ${serverName}:`,
      error,
    );
    throw error;
  }
};

/**
 * Deletes an OAuth file
 */
export const deleteMcpOAuthFile = async (
  serverName: string,
  filename: string,
): Promise<void> => {
  try {
    const filePath = await getMcpOAuthFilePath(serverName, filename);
    await fs.unlink(filePath);
    log.info(`OAuth file ${filename} deleted for server ${serverName}`);
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      log.error(
        `Error deleting OAuth file ${filename} for server ${serverName}:`,
        error,
      );
    }
  }
};

/**
 * Lists all OAuth files for a server
 */
export const listMcpOAuthFiles = async (
  serverName: string,
): Promise<string[]> => {
  try {
    const oauthDir = await getMcpOAuthDir();
    const safeServerName = serverName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const files = await fs.readdir(oauthDir);

    return files
      .filter((file) => file.startsWith(`${safeServerName}_`))
      .map((file) => file.substring(`${safeServerName}_`.length));
  } catch (error) {
    log.error(`Error listing OAuth files for server ${serverName}:`, error);
    return [];
  }
};

/**
 * Clears all OAuth data for a server
 */
export const clearMcpOAuthData = async (serverName: string): Promise<void> => {
  try {
    const files = await listMcpOAuthFiles(serverName);
    await Promise.all(
      files.map((filename) => deleteMcpOAuthFile(serverName, filename)),
    );
    log.info(`All OAuth data cleared for server ${serverName}`);
  } catch (error) {
    log.error(`Error clearing OAuth data for server ${serverName}:`, error);
    throw error;
  }
};
