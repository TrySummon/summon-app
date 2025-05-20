import { ipcMain } from "electron";
import keytar from "keytar";
import https from 'https';
import http from 'http';
import { URL } from 'url';
import {
  AUTH_GET_CREDENTIALS_CHANNEL,
  AUTH_SAVE_CREDENTIALS_CHANNEL,
  AUTH_CLEAR_CREDENTIALS_CHANNEL,
  AUTH_TEST_CREDENTIALS_CHANNEL,
} from "./auth-channels";

// Service name for keytar
const SERVICE_NAME = "toolman-api-credentials";

// Helper function to make HTTP requests from the main process
async function makeRequest(url: string, headers: Record<string, string> = {}): Promise<{ status: number, success: boolean, message?: string }> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: 'GET',
        headers,
        // Short timeout to avoid hanging
        timeout: 10000,
        // Reject unauthorized SSL certificates (can be made configurable later)
        rejectUnauthorized: false
      };

      // Choose http or https module based on protocol
      const requestModule = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = requestModule.request(options, (res) => {
        // For testing auth, we consider 2xx and 3xx status codes as success
        const isSuccess = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400;
        
        // We don't need the response body for auth testing
        res.on('data', () => {});
        
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            success: isSuccess,
            message: `Status: ${res.statusCode}`
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          status: 0,
          success: false,
          message: `Error: ${error.message}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 0,
          success: false,
          message: 'Request timed out'
        });
      });

      req.end();
    } catch (error: any) {
      resolve({
        status: 0,
        success: false,
        message: `Error: ${error.message}`
      });
    }
  });
}

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

  // Test credentials against a base URL
  ipcMain.handle(AUTH_TEST_CREDENTIALS_CHANNEL, async (_, baseUrl: string, authType: string, authData: any) => {
    try {
      // Prepare headers based on auth type
      const headers: Record<string, string> = {};
      
      if (authType === 'basicAuth' && authData) {
        const { username, password } = authData;
        const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
        headers['Authorization'] = `Basic ${base64Credentials}`;
      } else if (authType === 'bearerToken' && authData) {
        headers['Authorization'] = `Bearer ${authData.token}`;
      } else if (authType === 'apiKey' && authData) {
        const { key, name, in: location } = authData;
        if (location === 'header') {
          headers[name] = key;
        }
      }
      
      // Build the final URL with query parameters if needed
      let finalUrl = baseUrl;
      if (authType === 'apiKey' && authData && authData.in === 'query') {
        const separator = baseUrl.includes('?') ? '&' : '?';
        finalUrl = `${baseUrl}${separator}${authData.name}=${encodeURIComponent(authData.key)}`;
      }
      
      // Make the request
      const result = await makeRequest(finalUrl, headers);
      return result;
    } catch (error: any) {
      console.error("Error testing credentials:", error);
      return {
        status: 0,
        success: false,
        message: `Error: ${error.message}`
      };
    }
  });
}
