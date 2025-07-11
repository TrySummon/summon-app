import { EventEmitter } from "events";
import { Server } from "http";
import { addMcpLog } from "../mcp";
import { McpOAuthProvider } from "./provider";
import {
  setupMcpOAuthCallbackServer,
  findAvailablePort,
} from "./callback-server";

// OAuth callback servers for each server
const oauthCallbackServers = new Map<
  string,
  { server: Server; events: EventEmitter; port: number }
>();

/**
 * Configuration for OAuth setup
 */
export interface McpOAuthConfig {
  serverName: string;
  serverUrl: string;
  clientName?: string;
  clientUri?: string;
  host?: string;
}

/**
 * OAuth setup result
 */
export interface McpOAuthSetup {
  authProvider: McpOAuthProvider;
  waitForAuth: () => Promise<string>;
  cleanup: () => void;
}

/**
 * Detect if a server URL supports OAuth by checking for authorization endpoint
 */
export const detectOAuthSupport = async (
  serverUrl: string,
): Promise<boolean> => {
  try {
    // Try to access the server's authorization endpoint
    const url = new URL(serverUrl);
    const authUrl = new URL(
      "/.well-known/oauth-authorization-server",
      url.origin,
    );

    const response = await fetch(authUrl.toString(), {
      method: "GET",
    });

    return response.ok;
  } catch {
    // If we can't reach the auth endpoint, assume no OAuth support
    return false;
  }
};

/**
 * Automatically determine if OAuth should be enabled for a server
 */
export const shouldEnableOAuth = async (
  serverName: string,
  serverUrl: string,
): Promise<boolean> => {
  // For HTTP/SSE servers, always try to detect OAuth support automatically
  if (serverUrl) {
    addMcpLog(
      serverName,
      "info",
      "Auto-detecting OAuth support for server",
      true,
    );
    const supportsOAuth = await detectOAuthSupport(serverUrl);
    if (supportsOAuth) {
      addMcpLog(
        serverName,
        "info",
        "Server supports OAuth, enabling authentication",
        true,
      );
    } else {
      addMcpLog(
        serverName,
        "info",
        "Server does not support OAuth, proceeding without authentication",
        true,
      );
    }
    return supportsOAuth;
  }

  // For CLI servers, default to no OAuth
  return false;
};

/**
 * Setup OAuth authentication for a server
 */
export const setupOAuthAuthentication = async (
  config: McpOAuthConfig,
): Promise<McpOAuthSetup> => {
  const { serverName, serverUrl, clientName, clientUri, host } = config;

  addMcpLog(serverName, "info", "Setting up OAuth authentication", true);

  const events = new EventEmitter();
  const callbackPort = await findAvailablePort();

  // Create OAuth provider with sensible defaults
  const authProvider = new McpOAuthProvider({
    serverName,
    serverUrl,
    callbackPort,
    host: host || "localhost",
    clientName: clientName || `Summon - ${serverName}`,
    clientUri:
      clientUri || "https://github.com/modelcontextprotocol/summon-app",
    staticOAuthClientMetadata: undefined,
    staticOAuthClientInfo: undefined,
  });

  // Setup callback server
  const callbackServer = setupMcpOAuthCallbackServer({
    serverName,
    port: callbackPort,
    path: "/oauth/callback",
    events,
  });

  // Store server info for cleanup
  oauthCallbackServers.set(serverName, {
    server: callbackServer.server,
    events,
    port: callbackServer.getActualPort(),
  });

  const cleanup = () => {
    const serverInfo = oauthCallbackServers.get(serverName);
    if (serverInfo) {
      addMcpLog(serverName, "debug", "Cleaning up OAuth callback server", true);
      serverInfo.server.close();
      oauthCallbackServers.delete(serverName);
    }
  };

  addMcpLog(
    serverName,
    "info",
    `OAuth callback server running on port ${callbackServer.getActualPort()}`,
    true,
  );

  return {
    authProvider,
    waitForAuth: callbackServer.waitForAuthCode,
    cleanup,
  };
};

/**
 * Clean up OAuth setup for a specific server
 */
export const cleanupOAuthAuthentication = (serverName: string): void => {
  const serverInfo = oauthCallbackServers.get(serverName);
  if (serverInfo) {
    addMcpLog(serverName, "debug", "Cleaning up OAuth callback server", true);
    serverInfo.server.close();
    oauthCallbackServers.delete(serverName);
  }
};

/**
 * Clean up all OAuth setups
 */
export const cleanupAllOAuthAuthentication = (): void => {
  oauthCallbackServers.forEach((serverInfo, serverName) => {
    addMcpLog(serverName, "debug", "Cleaning up OAuth callback server", true);
    serverInfo.server.close();
  });
  oauthCallbackServers.clear();
};

// Re-export components for convenience
export { McpOAuthProvider } from "./provider";
export {
  setupMcpOAuthCallbackServer,
  findAvailablePort,
} from "./callback-server";
export * from "./storage";
