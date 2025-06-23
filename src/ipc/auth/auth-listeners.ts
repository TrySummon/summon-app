import { ipcMain, safeStorage, app } from "electron";
import https from "https";
import http from "http";
import { URL } from "url";
import path from "path";
import fs from "fs/promises";
import {
  AUTH_TEST_CREDENTIALS_CHANNEL,
  OAUTH_AUTHENTICATE_CHANNEL,
  OAUTH_GET_USER_CHANNEL,
  OAUTH_LOGOUT_CHANNEL,
} from "./auth-channels";
import { McpAuth } from "@/components/mcp-builder/api-config";
import log from "electron-log/main";
import { shell } from "electron";
import crypto from "crypto";
import { captureEvent } from "@/lib/posthog";

// Helper function to make HTTP requests from the main process
async function makeRequest(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; success: boolean; message?: string }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "GET",
        headers,
        // Short timeout to avoid hanging
        timeout: 10000,
        // Reject unauthorized SSL certificates (can be made configurable later)
        rejectUnauthorized: false,
      };

      // Choose http or https module based on protocol
      const requestModule = parsedUrl.protocol === "https:" ? https : http;

      const req = requestModule.request(options, (res) => {
        // For testing auth, we consider 2xx and 3xx status codes as success
        const isSuccess =
          res.statusCode !== undefined &&
          res.statusCode >= 200 &&
          res.statusCode < 400;

        // We don't need the response body for auth testing
        res.on("data", () => {});

        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            success: isSuccess,
            message: `Status: ${res.statusCode}`,
          });
        });
      });

      req.on("error", (error) => {
        resolve({
          status: 0,
          success: false,
          message: `Error: ${error.message}`,
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          status: 0,
          success: false,
          message: "Request timed out",
        });
      });

      req.end();
    } catch (error: unknown) {
      resolve({
        status: 0,
        success: false,
        message: `Error: ${String(error)}`,
      });
    }
  });
}

const PROTOCOL = "summon";
const REDIRECT_URI = `${PROTOCOL}://auth-callback`;

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthData {
  token: string;
  user: UserInfo;
}

// Secure storage functions
class SecureAuthStorage {
  private readonly authFilePath: string;

  constructor() {
    this.authFilePath = path.join(app.getPath("userData"), "auth-data.enc");
  }

  async storeAuthData(token: string, user: UserInfo): Promise<void> {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        log.warn("Encryption not available, storing auth data as plain text");
        // Fallback to plain text storage (not recommended for production)
        const authData: AuthData = { token, user };
        await fs.writeFile(this.authFilePath, JSON.stringify(authData), "utf8");
        return;
      }

      const authData: AuthData = { token, user };
      const plainText = JSON.stringify(authData);
      const encrypted = safeStorage.encryptString(plainText);

      await fs.writeFile(this.authFilePath, encrypted);
      log.info("Auth data stored securely");
    } catch (error) {
      log.error("Failed to store auth data:", error);
      throw error;
    }
  }

  async getAuthData(): Promise<AuthData | null> {
    try {
      const fileExists = await fs
        .access(this.authFilePath)
        .then(() => true)
        .catch(() => false);
      if (!fileExists) {
        return null;
      }

      const fileContent = await fs.readFile(this.authFilePath);

      if (!safeStorage.isEncryptionAvailable()) {
        log.warn("Encryption not available, reading auth data as plain text");
        // Fallback to plain text reading
        const plainText = fileContent.toString("utf8");
        return JSON.parse(plainText) as AuthData;
      }

      const decrypted = safeStorage.decryptString(fileContent);
      const authData = JSON.parse(decrypted) as AuthData;

      log.info("Auth data retrieved successfully");
      return authData;
    } catch (error) {
      log.error("Failed to retrieve auth data:", error);
      return null;
    }
  }

  async clearAuthData(): Promise<void> {
    try {
      const fileExists = await fs
        .access(this.authFilePath)
        .then(() => true)
        .catch(() => false);
      if (fileExists) {
        await fs.unlink(this.authFilePath);
        log.info("Auth data cleared");
      }
    } catch (error) {
      log.error("Failed to clear auth data:", error);
      throw error;
    }
  }
}

class ElectronOAuth {
  private codeVerifier: string | null = null;
  private state: string | null = null;
  private pendingAuthResolve:
    | ((value: {
        success: boolean;
        token?: string;
        user?: UserInfo;
        message?: string;
      }) => void)
    | null = null;
  private pendingAuthReject: ((reason?: Error) => void) | null = null;

  generatePKCEParams(): { codeChallenge: string; state: string } {
    this.codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(this.codeVerifier)
      .digest("base64url");
    this.state = crypto.randomBytes(16).toString("base64url");

    return { codeChallenge, state: this.state };
  }

  async authenticate(): Promise<{
    success: boolean;
    token?: string;
    user?: UserInfo;
    message?: string;
  }> {
    try {
      const serverUrl = process.env.VITE_PUBLIC_SUMMON_HOST;
      if (!serverUrl) {
        return {
          success: false,
          message: "SUMMON_SERVER_URL environment variable not set",
        };
      }

      return new Promise((resolve, reject) => {
        const { codeChallenge, state } = this.generatePKCEParams();

        // Store the promise resolvers for the callback
        this.pendingAuthResolve = resolve;
        this.pendingAuthReject = reject;

        // Build authorization URL
        const authUrl = new URL(`${serverUrl}/api/auth/electron/authorize`);
        authUrl.searchParams.set("code_challenge", codeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

        // Open OAuth flow in the user's default browser
        shell.openExternal(authUrl.toString()).catch((error) => {
          log.error("Failed to open browser for OAuth:", error);
          reject({
            success: false,
            message: "Failed to open browser for authentication",
          });
        });

        // Set a timeout for the authentication
        setTimeout(
          () => {
            if (this.pendingAuthResolve) {
              this.pendingAuthResolve({
                success: false,
                message: "Authentication timed out",
              });
              this.clearPendingAuth();
            }
          },
          5 * 60 * 1000,
        ); // 5 minute timeout
      });
    } catch (error) {
      log.error("Error during OAuth authentication:", error);
      return {
        success: false,
        message: `Authentication error: ${String(error)}`,
      };
    }
  }

  async handleProtocolCallback(callbackUrl: string): Promise<void> {
    log.info(`Protocol callback received: ${callbackUrl}`);

    if (!this.pendingAuthResolve) {
      log.warn("Received OAuth callback but no pending authentication");
      return;
    }

    log.info("Processing OAuth callback...");
    try {
      const serverUrl =
        process.env.SUMMON_SERVER_URL || process.env.VITE_PUBLIC_SUMMON_HOST;
      if (!serverUrl) {
        this.pendingAuthResolve({
          success: false,
          message: "SUMMON_SERVER_URL environment variable not set",
        });
        this.clearPendingAuth();
        return;
      }

      const result = await this.handleCallback(callbackUrl, serverUrl);
      this.pendingAuthResolve(result);
      this.clearPendingAuth();
    } catch (error) {
      log.error("Error handling OAuth callback:", error);
      if (this.pendingAuthReject) {
        this.pendingAuthReject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      this.clearPendingAuth();
    }
  }

  private clearPendingAuth(): void {
    this.pendingAuthResolve = null;
    this.pendingAuthReject = null;
  }

  private async handleCallback(
    callbackUrl: string,
    serverUrl: string,
  ): Promise<{
    success: boolean;
    token?: string;
    user?: UserInfo;
    message?: string;
  }> {
    try {
      log.info(`Handling OAuth callback: ${callbackUrl}`);
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        log.error(`OAuth error from server: ${error}`);
        return { success: false, message: `OAuth error: ${error}` };
      }

      if (!code) {
        log.error("Authorization code missing from callback");
        return { success: false, message: "Missing authorization code" };
      }

      // Exchange code for token
      log.info(
        `Exchanging code for token at: ${serverUrl}/api/auth/electron/token`,
      );
      log.info(`Code verifier length: ${this.codeVerifier?.length}`);
      log.info(`Redirect URI: ${REDIRECT_URI}`);

      const tokenResponse = await fetch(
        `${serverUrl}/api/auth/electron/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            redirectUri: REDIRECT_URI,
          }),
        },
      );

      const tokenResponseJson = await tokenResponse.json();
      log.info(`Token response status: ${tokenResponse.status}`);
      captureEvent("signed_in", {
        email: tokenResponseJson.user.email,
        name: tokenResponseJson.user.name,
      });

      if (!tokenResponse.ok) {
        const errorMessage =
          tokenResponseJson.error ||
          tokenResponseJson.message ||
          JSON.stringify(tokenResponseJson);
        return {
          success: false,
          message: `Token exchange failed: ${errorMessage}`,
        };
      }

      const { user, token } = tokenResponseJson;

      log.info(
        `Authentication successful for user: ${user.name || user.email}`,
      );
      return {
        success: true,
        token: token as string,
        user: user as UserInfo,
      };
    } catch (error) {
      log.error("Error handling OAuth callback:", error);
      return { success: false, message: `Callback error: ${String(error)}` };
    }
  }
}

const oauthClient = new ElectronOAuth();
const authStorage = new SecureAuthStorage();

// Export function to handle protocol callbacks from main process
export function handleOAuthProtocolCallback(url: string): void {
  log.info(`Main process received protocol callback: ${url}`);
  if (oauthClient) {
    oauthClient.handleProtocolCallback(url);
  } else {
    log.error("OAuth client not initialized when protocol callback received");
  }
}

export function registerAuthListeners() {
  // OAuth authentication
  ipcMain.handle(OAUTH_AUTHENTICATE_CHANNEL, async () => {
    try {
      const result = await oauthClient.authenticate();
      if (result.success && result.token && result.user) {
        await authStorage.storeAuthData(result.token, result.user);
      }
      return result;
    } catch (error) {
      log.error("OAuth authentication failed:", error);
      return {
        success: false,
        message: `Authentication failed: ${String(error)}`,
      };
    }
  });

  // Get current user
  ipcMain.handle(OAUTH_GET_USER_CHANNEL, async () => {
    try {
      const authData = await authStorage.getAuthData();
      if (!authData) {
        return { success: false, message: "Not authenticated" };
      }
      return { success: true, user: authData.user, token: authData.token };
    } catch (error) {
      log.error("Failed to get current user:", error);
      return {
        success: false,
        message: "Failed to retrieve authentication data",
      };
    }
  });

  // Logout
  ipcMain.handle(OAUTH_LOGOUT_CHANNEL, async () => {
    try {
      await authStorage.clearAuthData();
      return { success: true };
    } catch (error) {
      log.error("Failed to logout:", error);
      return { success: false, message: "Failed to clear authentication data" };
    }
  });

  // Test credentials against a base URL
  ipcMain.handle(
    AUTH_TEST_CREDENTIALS_CHANNEL,
    async (_, baseUrl: string, authData: McpAuth) => {
      try {
        // Prepare headers based on auth type
        const headers: Record<string, string> = {};

        if (authData.type === "bearerToken" && authData.token) {
          headers["Authorization"] = `Bearer ${authData.token}`;
        } else if (authData.type === "apiKey" && authData.key) {
          const { key, name, in: location } = authData;
          if (location === "header" && name) {
            headers[name] = key;
          }
        }

        // Build the final URL with query parameters if needed
        let finalUrl = baseUrl;
        if (
          authData.type === "apiKey" &&
          authData.in === "query" &&
          authData.key
        ) {
          const separator = baseUrl.includes("?") ? "&" : "?";
          finalUrl = `${baseUrl}${separator}${authData.name}=${encodeURIComponent(authData.key)}`;
        }

        // Make the request
        const result = await makeRequest(finalUrl, headers);
        return result;
      } catch (error: unknown) {
        log.error("Error testing credentials:", error);
        return {
          status: 0,
          success: false,
          message: `Error: ${String(error)}`,
        };
      }
    },
  );
}
