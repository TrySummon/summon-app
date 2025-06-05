import { ipcMain } from "electron";
import https from "https";
import http from "http";
import { URL } from "url";
import { AUTH_TEST_CREDENTIALS_CHANNEL } from "./auth-channels";
import { McpAuth } from "@/components/mcp-builder/start-mcp-dialog";

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

export function registerAuthListeners() {
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
        console.error("Error testing credentials:", error);
        return {
          status: 0,
          success: false,
          message: `Error: ${String(error)}`,
        };
      }
    },
  );
}
