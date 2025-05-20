import {
  AUTH_GET_CREDENTIALS_CHANNEL,
  AUTH_SAVE_CREDENTIALS_CHANNEL,
  AUTH_CLEAR_CREDENTIALS_CHANNEL,
  AUTH_TEST_CREDENTIALS_CHANNEL,
} from "./auth-channels";

export function exposeAuthContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  
  contextBridge.exposeInMainWorld("auth", {
    getCredentials: (apiId: string) => 
      ipcRenderer.invoke(AUTH_GET_CREDENTIALS_CHANNEL, apiId),
    
    saveCredentials: (apiId: string, credentials: any) => 
      ipcRenderer.invoke(AUTH_SAVE_CREDENTIALS_CHANNEL, apiId, credentials),
    
    clearCredentials: (apiId: string) => 
      ipcRenderer.invoke(AUTH_CLEAR_CREDENTIALS_CHANNEL, apiId),
    
    testCredentials: (baseUrl: string, authType: string, authData: any) => 
      ipcRenderer.invoke(AUTH_TEST_CREDENTIALS_CHANNEL, baseUrl, authType, authData),
  });
}
