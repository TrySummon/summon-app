import { ipcMain } from "electron";
import keytar from "keytar";
import {
  AI_PROVIDERS_GET_CREDENTIALS_CHANNEL,
  AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
  AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL,
} from "./ai-providers-channels";

// Service name for keytar
const SERVICE_NAME = "agentport-ai-providers";


export function registerAIProvidersListeners() {
  // Get all credentials for AI providers
  ipcMain.handle(AI_PROVIDERS_GET_CREDENTIALS_CHANNEL, async () => {
    try {
      // Get all accounts (provider names) from keytar
      const accounts = await keytar.findCredentials(SERVICE_NAME);
      
      // Map accounts to provider objects
      return accounts.map(({ account, password }) => {
        try {
          // Parse the stored JSON data
          const providerData = JSON.parse(password);
          
          return {
            id: account,
            ...providerData
          };
        } catch (error) {
          console.error(`Error parsing provider data for ${account}:`, error);
          return {
            id: account,
            name: account,
            configured: false,
            error: 'Invalid provider data format'
          };
        }
      });
    } catch (error: any) {
      console.error("Error getting AI provider credentials:", error);
      throw new Error(`Failed to get credentials: ${error.message}`);
    }
  });

  // Save credential for an AI provider
  ipcMain.handle(AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL, async (_, providerId: string, providerData: any) => {
    try {
      // Store the provider data as JSON
      const dataToStore = JSON.stringify(providerData);
      
      // Save to keytar
      await keytar.setPassword(SERVICE_NAME, providerId, dataToStore);
      
      return { success: true };
    } catch (error: any) {
      console.error("Error saving AI provider credential:", error);
      throw new Error(`Failed to save credential: ${error.message}`);
    }
  });

  // Delete credential for an AI provider
  ipcMain.handle(AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL, async (_, providerId: string) => {
    try {
      // Delete from keytar
      const result = await keytar.deletePassword(SERVICE_NAME, providerId);
      
      return { success: result };
    } catch (error: any) {
      console.error("Error deleting AI provider credential:", error);
      throw new Error(`Failed to delete credential: ${error.message}`);
    }
  });
}
