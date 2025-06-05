import { ipcMain, safeStorage, app } from "electron";
import path from "path";
import fs from "fs/promises";
import {
  AI_PROVIDERS_GET_CREDENTIALS_CHANNEL,
  AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
  AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL,
} from "./ai-providers-channels";
import { AIProviderCredential } from "@/components/ai-providers/types";
import log from "electron-log/main";

// Directory for storing encrypted credentials
const getCredentialsDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "ai-provider-credentials");
};

// Ensure the credentials directory exists
const ensureCredentialsDir = async () => {
  const credentialsDir = getCredentialsDir();
  try {
    await fs.access(credentialsDir);
  } catch {
    await fs.mkdir(credentialsDir, { recursive: true });
  }
};

// Get the file path for storing encrypted credentials
const getCredentialFilePath = (providerId: string) => {
  return path.join(getCredentialsDir(), `${providerId}.enc`);
};

export function registerAIProvidersListeners() {
  // Get all credentials for AI providers
  ipcMain.handle(AI_PROVIDERS_GET_CREDENTIALS_CHANNEL, async () => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        log.warn(
          "Encryption not available, cannot retrieve AI provider credentials",
        );
        return [];
      }

      const credentialsDir = getCredentialsDir();

      try {
        const files = await fs.readdir(credentialsDir);
        const credentials = [];

        for (const file of files) {
          if (file.endsWith(".enc")) {
            const providerId = file.replace(".enc", "");
            const filePath = path.join(credentialsDir, file);

            try {
              const encryptedData = await fs.readFile(filePath);
              const decryptedData = safeStorage.decryptString(encryptedData);
              const providerData = JSON.parse(decryptedData);

              credentials.push({
                id: providerId,
                ...providerData,
              });
            } catch {
              log.error(`Error parsing provider data for ${providerId}`);
              credentials.push({
                id: providerId,
                name: providerId,
                configured: false,
                error: "Invalid provider data format",
              });
            }
          }
        }

        return credentials;
      } catch {
        // Directory doesn't exist yet
        return [];
      }
    } catch {
      log.error("Error getting AI provider credentials");
      throw new Error("Failed to get credentials");
    }
  });

  // Save credential for an AI provider
  ipcMain.handle(
    AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
    async (_, providerId: string, providerData: AIProviderCredential) => {
      try {
        if (!safeStorage.isEncryptionAvailable()) {
          log.warn("Encryption not available, credentials will not be stored");
          return { success: false, error: "Encryption not available" };
        }

        // Store the provider data as JSON
        const dataToStore = JSON.stringify(providerData);

        // Encrypt and save to file
        await ensureCredentialsDir();
        const encrypted = safeStorage.encryptString(dataToStore);
        const filePath = getCredentialFilePath(providerId);
        await fs.writeFile(filePath, encrypted);

        return { success: true };
      } catch {
        log.error("Error saving AI provider credential");
        throw new Error("Failed to save credential");
      }
    },
  );

  // Delete credential for an AI provider
  ipcMain.handle(
    AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL,
    async (_, providerId: string) => {
      try {
        const filePath = getCredentialFilePath(providerId);

        try {
          await fs.unlink(filePath);
          return { success: true };
        } catch {
          // File doesn't exist, which is fine
          return { success: true };
        }
      } catch {
        log.error("Error deleting AI provider credential");
        throw new Error("Failed to delete credential");
      }
    },
  );
}
