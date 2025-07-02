import { contextBridge, ipcRenderer } from "electron";
import {
  AUTH_TEST_CREDENTIALS_CHANNEL,
  OAUTH_AUTHENTICATE_CHANNEL,
  OAUTH_GET_USER_CHANNEL,
  OAUTH_LOGOUT_CHANNEL,
} from "./auth-channels";
import { McpAuth } from "@/components/mcp-builder/api-config";

export function exposeAuthContext() {
  contextBridge.exposeInMainWorld("auth", {
    testCredentials: (baseUrl: string, authData: McpAuth) =>
      ipcRenderer.invoke(AUTH_TEST_CREDENTIALS_CHANNEL, baseUrl, authData),
    // OAuth methods
    authenticate: () => ipcRenderer.invoke(OAUTH_AUTHENTICATE_CHANNEL),
    getUser: () => ipcRenderer.invoke(OAUTH_GET_USER_CHANNEL),
    logout: () => ipcRenderer.invoke(OAUTH_LOGOUT_CHANNEL),
  });
}
