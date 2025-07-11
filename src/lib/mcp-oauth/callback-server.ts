import express from "express";
import { EventEmitter } from "events";
import { AddressInfo } from "net";
import log from "electron-log";
import { addMcpLog } from "../mcp";

interface OAuthCallbackServerOptions {
  serverName: string;
  port: number;
  path: string;
  events: EventEmitter;
}

/**
 * Sets up an Express server to handle OAuth callbacks for external MCP servers
 */
export function setupMcpOAuthCallbackServer(
  options: OAuthCallbackServerOptions,
) {
  let authCode: string | null = null;
  const app = express();

  // Create a promise to track when auth is completed
  let authCompletedResolve: (code: string) => void;
  const authCompletedPromise = new Promise<string>((resolve) => {
    authCompletedResolve = resolve;
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.status(200).send("OAuth callback server is running");
  });

  // Long-polling endpoint to check auth status
  app.get("/wait-for-auth", (req, res) => {
    if (authCode) {
      // Auth already completed
      addMcpLog(
        options.serverName,
        "debug",
        "OAuth auth already completed, returning 200",
        true,
      );
      res.status(200).send("Authentication completed");
      return;
    }

    if (req.query.poll === "false") {
      addMcpLog(
        options.serverName,
        "debug",
        "Client requested no long poll, responding with 202",
        true,
      );
      res.status(202).send("Authentication in progress");
      return;
    }

    // Long poll - wait for up to 30 seconds
    const longPollTimeout = setTimeout(() => {
      addMcpLog(
        options.serverName,
        "debug",
        "OAuth long poll timeout reached, responding with 202",
        true,
      );
      res.status(202).send("Authentication in progress");
    }, 30000);

    // If auth completes while we're waiting, send the response immediately
    authCompletedPromise
      .then(() => {
        clearTimeout(longPollTimeout);
        if (!res.headersSent) {
          addMcpLog(
            options.serverName,
            "debug",
            "OAuth auth completed during long poll, responding with 200",
            true,
          );
          res.status(200).send("Authentication completed");
        }
      })
      .catch(() => {
        clearTimeout(longPollTimeout);
        if (!res.headersSent) {
          addMcpLog(
            options.serverName,
            "error",
            "OAuth auth failed during long poll, responding with 500",
            true,
          );
          res.status(500).send("Authentication failed");
        }
      });
  });

  // OAuth callback endpoint
  app.get(options.path, (req, res) => {
    const code = req.query.code as string | undefined;
    const error = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

    addMcpLog(
      options.serverName,
      "info",
      `OAuth callback received - code: ${!!code}, error: ${error}`,
      true,
    );

    if (error) {
      addMcpLog(
        options.serverName,
        "error",
        `OAuth error: ${error} - ${errorDescription}`,
        true,
      );
      res.status(400).send(`OAuth Error: ${error}\n${errorDescription || ""}`);
      return;
    }

    if (!code) {
      addMcpLog(
        options.serverName,
        "error",
        "No OAuth authorization code received",
        true,
      );
      res.status(400).send("Error: No authorization code received");
      return;
    }

    authCode = code;
    addMcpLog(
      options.serverName,
      "info",
      "OAuth authorization code received successfully",
      true,
    );
    authCompletedResolve(code);

    res.send(`
      <html>
        <head>
          <title>Authorization Complete</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #fafafa;
              color: #1a1a1a;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              max-width: 400px;
              padding: 3rem 2rem;
            }
            .success-icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 2rem;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .check-mark {
              width: 28px;
              height: 28px;
              stroke: white;
              stroke-width: 3;
              fill: none;
            }
            h1 { 
              margin: 0 0 1rem;
              font-size: 1.5rem;
              font-weight: 600;
              color: #1a1a1a;
            }
            p { 
              margin: 0;
              font-size: 0.95rem;
              color: #6b7280;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">
              <svg class="check-mark" viewBox="0 0 24 24">
                <polyline points="20,6 9,17 4,12"></polyline>
              </svg>
            </div>
            <h1>Authorization Complete</h1>
            <p>You can now close this window and return to Summon.</p>
          </div>
        </body>
      </html>
    `);

    // Notify main flow that auth code is available
    options.events.emit("auth-code-received", code);
  });

  const server = app.listen(options.port, () => {
    const actualPort = (server.address() as AddressInfo).port;
    addMcpLog(
      options.serverName,
      "info",
      `OAuth callback server running on port ${actualPort}`,
      true,
    );
    log.info(
      `OAuth callback server for ${options.serverName} running on port ${actualPort}`,
    );
  });

  const waitForAuthCode = (): Promise<string> => {
    return new Promise((resolve) => {
      if (authCode) {
        resolve(authCode);
        return;
      }

      options.events.once("auth-code-received", (code) => {
        resolve(code);
      });
    });
  };

  return {
    server,
    authCode,
    waitForAuthCode,
    authCompletedPromise,
    getActualPort: () => (server.address() as AddressInfo).port,
  };
}

/**
 * Find an available port for the OAuth callback server
 */
export async function findAvailablePort(
  preferredPort?: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = express().listen(preferredPort || 0, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }

      const port = (server.address() as AddressInfo).port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}
