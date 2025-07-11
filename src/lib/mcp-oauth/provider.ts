import { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import {
  OAuthClientInformationFull,
  OAuthClientInformationFullSchema,
  OAuthTokens,
  OAuthTokensSchema,
  OAuthClientMetadata,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { shell } from "electron";
import crypto from "crypto";
import {
  readMcpOAuthFile,
  writeMcpOAuthFile,
  deleteMcpOAuthFile,
} from "./storage";
import { addMcpLog } from "../mcp";

export interface McpOAuthOptions {
  serverName: string;
  serverUrl: string;
  callbackPort: number;
  host?: string;
  clientName?: string;
  clientUri?: string;
  staticOAuthClientMetadata?: Partial<OAuthClientMetadata>;
  staticOAuthClientInfo?: OAuthClientInformationFull;
}

/**
 * OAuth client provider for external MCP servers
 */
export class McpOAuthProvider implements OAuthClientProvider {
  private serverName: string;
  private callbackPath: string;
  private clientName: string;
  private clientUri: string;
  private softwareId: string;
  private softwareVersion: string;
  private staticOAuthClientMetadata?: Partial<OAuthClientMetadata>;
  private staticOAuthClientInfo?: OAuthClientInformationFull;
  private _state: string;
  private callbackPort: number;
  private host: string;

  constructor(options: McpOAuthOptions) {
    this.serverName = options.serverName;
    this.callbackPath = "/oauth/callback";
    this.clientName = options.clientName || "Summon MCP Client";
    this.clientUri =
      options.clientUri || "https://github.com/summon-app/summon";
    this.softwareId = "summon-mcp-client";
    this.softwareVersion = "1.0.0";
    this.staticOAuthClientMetadata = options.staticOAuthClientMetadata;
    this.staticOAuthClientInfo = options.staticOAuthClientInfo;
    this.callbackPort = options.callbackPort;
    this.host = options.host || "localhost";
    this._state = crypto.randomUUID();
  }

  get redirectUrl(): string {
    return `http://${this.host}:${this.callbackPort}${this.callbackPath}`;
  }

  get clientMetadata() {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: this.clientName,
      client_uri: this.clientUri,
      software_id: this.softwareId,
      software_version: this.softwareVersion,
      ...this.staticOAuthClientMetadata,
    };
  }

  state(): string {
    return this._state;
  }

  /**
   * Gets the client information if it exists
   */
  async clientInformation(): Promise<OAuthClientInformationFull | undefined> {
    addMcpLog(this.serverName, "debug", "Reading OAuth client info", true);

    if (this.staticOAuthClientInfo) {
      addMcpLog(
        this.serverName,
        "debug",
        "Using static OAuth client info",
        true,
      );
      return this.staticOAuthClientInfo;
    }

    const clientInfo = await readMcpOAuthFile<OAuthClientInformationFull>(
      this.serverName,
      "client_info.json",
      OAuthClientInformationFullSchema,
    );

    addMcpLog(
      this.serverName,
      "debug",
      clientInfo ? "OAuth client info found" : "OAuth client info not found",
      true,
    );

    return clientInfo;
  }

  /**
   * Saves client information
   */
  async saveClientInformation(
    clientInformation: OAuthClientInformationFull,
  ): Promise<void> {
    addMcpLog(
      this.serverName,
      "debug",
      `Saving OAuth client info for client_id: ${clientInformation.client_id}`,
      true,
    );

    await writeMcpOAuthFile(
      this.serverName,
      "client_info.json",
      clientInformation,
    );
  }

  /**
   * Gets the OAuth tokens if they exist
   */
  async tokens(): Promise<OAuthTokens | undefined> {
    addMcpLog(this.serverName, "debug", "Reading OAuth tokens", true);

    const tokens = await readMcpOAuthFile<OAuthTokens>(
      this.serverName,
      "tokens.json",
      OAuthTokensSchema,
    );

    if (tokens) {
      const timeLeft = tokens.expires_in || 0;
      addMcpLog(
        this.serverName,
        "debug",
        `OAuth tokens found, expires in ${timeLeft} seconds`,
        true,
      );
    } else {
      addMcpLog(this.serverName, "debug", "OAuth tokens not found", true);
    }

    return tokens;
  }

  /**
   * Saves OAuth tokens
   */
  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const timeLeft = tokens.expires_in || 0;
    addMcpLog(
      this.serverName,
      "debug",
      `Saving OAuth tokens, expires in ${timeLeft} seconds`,
      true,
    );

    await writeMcpOAuthFile(this.serverName, "tokens.json", tokens);
  }

  /**
   * Redirects the user to the authorization URL
   */
  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    addMcpLog(
      this.serverName,
      "info",
      `Opening OAuth authorization URL: ${authorizationUrl.toString()}`,
      true,
    );

    try {
      await shell.openExternal(authorizationUrl.toString());
      addMcpLog(
        this.serverName,
        "info",
        "OAuth browser opened successfully",
        true,
      );
    } catch (error) {
      addMcpLog(
        this.serverName,
        "error",
        `Failed to open OAuth browser: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
      throw error;
    }
  }

  /**
   * Saves the PKCE code verifier
   */
  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    addMcpLog(this.serverName, "debug", "Saving OAuth code verifier", true);
    await writeMcpOAuthFile(this.serverName, "code_verifier.txt", codeVerifier);
  }

  /**
   * Gets the PKCE code verifier
   */
  async codeVerifier(): Promise<string> {
    addMcpLog(this.serverName, "debug", "Reading OAuth code verifier", true);

    const verifier = await readMcpOAuthFile<string>(
      this.serverName,
      "code_verifier.txt",
      { parse: (data: unknown) => String(data) },
    );

    if (!verifier) {
      throw new Error("No OAuth code verifier found");
    }

    addMcpLog(this.serverName, "debug", "OAuth code verifier found", true);
    return verifier;
  }

  /**
   * Invalidates the specified credentials
   */
  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier",
  ): Promise<void> {
    addMcpLog(
      this.serverName,
      "debug",
      `Invalidating OAuth credentials: ${scope}`,
      true,
    );

    switch (scope) {
      case "all":
        await Promise.all([
          deleteMcpOAuthFile(this.serverName, "client_info.json"),
          deleteMcpOAuthFile(this.serverName, "tokens.json"),
          deleteMcpOAuthFile(this.serverName, "code_verifier.txt"),
        ]);
        addMcpLog(
          this.serverName,
          "debug",
          "All OAuth credentials invalidated",
          true,
        );
        break;

      case "client":
        await deleteMcpOAuthFile(this.serverName, "client_info.json");
        addMcpLog(
          this.serverName,
          "debug",
          "OAuth client information invalidated",
          true,
        );
        break;

      case "tokens":
        await deleteMcpOAuthFile(this.serverName, "tokens.json");
        addMcpLog(this.serverName, "debug", "OAuth tokens invalidated", true);
        break;

      case "verifier":
        await deleteMcpOAuthFile(this.serverName, "code_verifier.txt");
        addMcpLog(
          this.serverName,
          "debug",
          "OAuth code verifier invalidated",
          true,
        );
        break;

      default:
        throw new Error(`Unknown OAuth credential scope: ${scope}`);
    }
  }
}
