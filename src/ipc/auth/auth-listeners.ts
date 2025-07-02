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
const AUTH_TIMEOUT = 60 * 1000; // 1 minute
const TOKEN_EXCHANGE_TIMEOUT = 30 * 1000; // 30 seconds

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

interface AuthResult {
  success: boolean;
  token?: string;
  user?: UserInfo;
  message?: string;
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
  private authTimeout: NodeJS.Timeout | null = null;
  private pendingAuthResolve: ((value: AuthResult) => void) | null = null;
  private pendingAuthReject: ((reason?: Error) => void) | null = null;

  private generateSecureRandomString(length: number): string {
    return crypto.randomBytes(length).toString("base64url");
  }

  private generatePKCEParams(): { codeChallenge: string; state: string } {
    // Generate cryptographically secure random values
    this.codeVerifier = this.generateSecureRandomString(32);
    const codeChallenge = crypto
      .createHash("sha256")
      .update(this.codeVerifier)
      .digest("base64url");
    this.state = this.generateSecureRandomString(16);

    log.info("Generated PKCE parameters", {
      codeChallengeLength: codeChallenge.length,
      stateLength: this.state.length,
    });

    return { codeChallenge, state: this.state };
  }

  private validateServerUrl(serverUrl: string): boolean {
    try {
      const url = new URL(serverUrl);
      return url.protocol === "https:" || url.hostname === "localhost";
    } catch {
      return false;
    }
  }

  private clearAuthTimeout(): void {
    if (this.authTimeout) {
      clearTimeout(this.authTimeout);
      this.authTimeout = null;
    }
  }

  private clearPendingAuth(): void {
    this.clearAuthTimeout();
    this.pendingAuthResolve = null;
    this.pendingAuthReject = null;
    this.codeVerifier = null;
    this.state = null;
  }

  private setupAuthTimeout(): void {
    this.authTimeout = setTimeout(() => {
      log.warn("Authentication timeout reached");
      if (this.pendingAuthResolve) {
        this.pendingAuthResolve({
          success: false,
          message: "Authentication timed out. Please try again.",
        });
        this.clearPendingAuth();
      }
    }, AUTH_TIMEOUT);
  }

  async authenticate(): Promise<AuthResult> {
    // Prevent multiple concurrent auth attempts
    if (this.pendingAuthResolve) {
      log.warn("Authentication already in progress");
      return {
        success: false,
        message: "Authentication already in progress",
      };
    }

    try {
      const serverUrl = process.env.PUBLIC_SUMMON_HOST;
      if (!serverUrl) {
        log.error("PUBLIC_SUMMON_HOST environment variable not set");
        return {
          success: false,
          message: "Server configuration error. Please contact support.",
        };
      }

      if (!this.validateServerUrl(serverUrl)) {
        log.error("Invalid server URL:", serverUrl);
        return {
          success: false,
          message: "Invalid server configuration. Please contact support.",
        };
      }

      return new Promise((resolve, reject) => {
        try {
          const { codeChallenge, state } = this.generatePKCEParams();

          // Store the promise resolvers for the callback
          this.pendingAuthResolve = resolve;
          this.pendingAuthReject = reject;

          // Setup timeout
          this.setupAuthTimeout();

          // Build authorization URL
          const authUrl = new URL(`${serverUrl}/api/auth/electron/authorize`);
          authUrl.searchParams.set("code_challenge", codeChallenge);
          authUrl.searchParams.set("code_challenge_method", "S256");
          authUrl.searchParams.set("state", state);
          authUrl.searchParams.set("redirect_uri", REDIRECT_URI);

          log.info("Starting OAuth flow", {
            serverUrl,
            redirectUri: REDIRECT_URI,
          });

          // Open OAuth flow in the user's default browser
          shell.openExternal(authUrl.toString()).catch((error) => {
            log.error("Failed to open browser for OAuth:", error);
            this.clearPendingAuth();
            resolve({
              success: false,
              message:
                "Failed to open browser for authentication. Please check your default browser settings.",
            });
          });
        } catch (error) {
          log.error("Error setting up OAuth flow:", error);
          this.clearPendingAuth();
          resolve({
            success: false,
            message: "Failed to initialize authentication. Please try again.",
          });
        }
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
    log.info("Protocol callback received", { callbackUrl });

    if (!this.pendingAuthResolve) {
      log.warn("Received OAuth callback but no pending authentication");
      return;
    }

    try {
      const serverUrl = process.env.PUBLIC_SUMMON_HOST;
      if (!serverUrl) {
        this.pendingAuthResolve({
          success: false,
          message: "Server configuration error. Please contact support.",
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

  private async handleCallback(
    callbackUrl: string,
    serverUrl: string,
  ): Promise<AuthResult> {
    try {
      log.info("Processing OAuth callback", { callbackUrl });
      const url = new URL(callbackUrl);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      // Handle OAuth errors
      if (error) {
        log.error("OAuth error from server", { error, errorDescription });
        const errorMessages: Record<string, string> = {
          access_denied: "Authentication was cancelled by the user.",
          invalid_request: "Invalid authentication request. Please try again.",
          invalid_client: "Client configuration error. Please contact support.",
          server_error: "Server error during authentication. Please try again.",
          temporarily_unavailable:
            "Authentication service temporarily unavailable. Please try again later.",
        };
        return {
          success: false,
          message: errorMessages[error] || `Authentication error: ${error}`,
        };
      }

      // Validate required parameters
      if (!code) {
        log.error("Authorization code missing from callback");
        return {
          success: false,
          message: "Authentication failed: Missing authorization code.",
        };
      }

      if (!state) {
        log.error("State parameter missing from callback");
        return {
          success: false,
          message: "Authentication failed: Missing state parameter.",
        };
      }

      // Validate state matches what we sent
      if (state !== this.state) {
        log.error("State mismatch", { expected: this.state, received: state });
        return {
          success: false,
          message: "Authentication failed: State validation error.",
        };
      }

      if (!this.codeVerifier) {
        log.error("Code verifier not available");
        return {
          success: false,
          message: "Authentication failed: Missing code verifier.",
        };
      }

      // Exchange code for token
      log.info("Exchanging authorization code for token");
      const tokenResult = await this.exchangeCodeForToken(
        serverUrl,
        code,
        this.codeVerifier,
      );

      if (tokenResult.success && tokenResult.token && tokenResult.user) {
        captureEvent("signed_in", {
          email: tokenResult.user.email,
          name: tokenResult.user.name,
        });
      }

      return tokenResult;
    } catch (error) {
      log.error("Error handling OAuth callback:", error);
      return {
        success: false,
        message: "Authentication failed due to an unexpected error.",
      };
    }
  }

  private async exchangeCodeForToken(
    serverUrl: string,
    code: string,
    codeVerifier: string,
  ): Promise<AuthResult> {
    try {
      const tokenUrl = `${serverUrl}/api/auth/electron/token`;

      log.info("Making token exchange request", {
        tokenUrl,
        codeLength: code.length,
        codeVerifierLength: codeVerifier.length,
        redirectUri: REDIRECT_URI,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        TOKEN_EXCHANGE_TIMEOUT,
      );

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Summon-Electron/1.0.0",
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: REDIRECT_URI,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      log.info("Token exchange response", {
        status: response.status,
        success: response.ok,
      });

      if (!response.ok) {
        const errorMessage = this.getTokenExchangeErrorMessage(
          responseData.error,
          responseData.error_description,
        );
        log.error("Token exchange failed", {
          status: response.status,
          error: responseData.error,
          description: responseData.error_description,
        });
        return {
          success: false,
          message: errorMessage,
        };
      }

      const { user, access_token: token } = responseData;

      if (!token || !user) {
        log.error("Token exchange succeeded but missing required data", {
          hasToken: !!token,
          hasUser: !!user,
        });
        return {
          success: false,
          message: "Authentication completed but user data is incomplete.",
        };
      }

      log.info("Authentication successful", {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
      });

      return {
        success: true,
        token: token as string,
        user: user as UserInfo,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        log.error("Token exchange timed out");
        return {
          success: false,
          message: "Authentication timed out. Please try again.",
        };
      }

      log.error("Token exchange error:", error);
      return {
        success: false,
        message: "Failed to complete authentication. Please try again.",
      };
    }
  }

  private getTokenExchangeErrorMessage(
    error?: string,
    errorDescription?: string,
  ): string {
    const errorMessages: Record<string, string> = {
      invalid_request: "Invalid authentication request. Please try again.",
      invalid_grant: "Authentication code has expired. Please try again.",
      invalid_client: "Client configuration error. Please contact support.",
      server_error: "Server error during authentication. Please try again.",
      insufficient_scope: "Unable to retrieve required user information.",
    };

    if (error && errorMessages[error]) {
      return errorMessages[error];
    }

    if (errorDescription) {
      return `Authentication failed: ${errorDescription}`;
    }

    return "Authentication failed. Please try again.";
  }
}

const oauthClient = new ElectronOAuth();
export const authStorage = new SecureAuthStorage();

// Export function to handle protocol callbacks from main process
export function handleOAuthProtocolCallback(url: string): void {
  log.info("Main process received protocol callback", { url });
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
      log.info("Starting OAuth authentication flow");
      const result = await oauthClient.authenticate();

      if (result.success && result.token && result.user) {
        log.info("Authentication successful, storing auth data");
        await authStorage.storeAuthData(result.token, result.user);
      } else {
        log.warn("Authentication failed", { message: result.message });
      }

      return result;
    } catch (error) {
      log.error("OAuth authentication failed:", error);
      return {
        success: false,
        message: "Authentication failed due to an unexpected error.",
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

      log.info("Retrieved current user", {
        userId: authData.user.id,
        userEmail: authData.user.email,
      });

      return {
        success: true,
        user: authData.user,
        token: authData.token,
      };
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
      log.info("Logging out user");
      await authStorage.clearAuthData();
      return { success: true };
    } catch (error) {
      log.error("Failed to logout:", error);
      return {
        success: false,
        message: "Failed to clear authentication data",
      };
    }
  });

  // Test credentials against a base URL
  ipcMain.handle(
    AUTH_TEST_CREDENTIALS_CHANNEL,
    async (_, baseUrl: string, authData: McpAuth) => {
      try {
        log.info("Testing credentials against base URL", { baseUrl });

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

        log.info("Credentials test result", {
          baseUrl,
          success: result.success,
          status: result.status,
        });

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
