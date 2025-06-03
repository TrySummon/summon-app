import { contextBridge, ipcRenderer } from "electron";
import { AUTH_TEST_CREDENTIALS_CHANNEL } from "./auth-channels";
import { McpAuth } from "@/components/mcp-builder/start-mcp-dialog";

export function exposeAuthContext() {
  contextBridge.exposeInMainWorld("auth", {
    testCredentials: (baseUrl: string, authType: string, authData: McpAuth) =>
      ipcRenderer.invoke(
        AUTH_TEST_CREDENTIALS_CHANNEL,
        baseUrl,
        authType,
        authData,
      ),
  });
}
