import {
  AUTH_TEST_CREDENTIALS_CHANNEL,
} from "./auth-channels";

export function exposeAuthContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  
  contextBridge.exposeInMainWorld("auth", {
    testCredentials: (baseUrl: string, authType: string, authData: any) => 
      ipcRenderer.invoke(AUTH_TEST_CREDENTIALS_CHANNEL, baseUrl, authType, authData),
  });
}
