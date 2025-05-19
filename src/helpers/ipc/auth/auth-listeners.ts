import { ipcMain } from "electron";
import keytar from "keytar";
import {
  AUTH_GET_CREDENTIALS_CHANNEL,
  AUTH_SAVE_CREDENTIALS_CHANNEL,
  AUTH_CLEAR_CREDENTIALS_CHANNEL,
} from "./auth-channels";

// Service name for keytar
const SERVICE_NAME = "toolman-api-credentials";

export function registerAuthListeners() {
  // Get credentials for a specific API
  ipcMain.handle(AUTH_GET_CREDENTIALS_CHANNEL, async (_, apiId: string) => {
    try {
      const credentials = await keytar.getPassword(SERVICE_NAME, apiId);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error("Error retrieving credentials:", error);
      return null;
    }
  });

  // Save credentials for a specific API
  ipcMain.handle(AUTH_SAVE_CREDENTIALS_CHANNEL, async (_, apiId: string, credentials: any) => {
    try {
      await keytar.setPassword(SERVICE_NAME, apiId, JSON.stringify(credentials));
      return true;
    } catch (error) {
      console.error("Error saving credentials:", error);
      return false;
    }
  });

  // Clear credentials for a specific API
  ipcMain.handle(AUTH_CLEAR_CREDENTIALS_CHANNEL, async (_, apiId: string) => {
    try {
      await keytar.deletePassword(SERVICE_NAME, apiId);
      return true;
    } catch (error) {
      console.error("Error clearing credentials:", error);
      return false;
    }
  });
}
