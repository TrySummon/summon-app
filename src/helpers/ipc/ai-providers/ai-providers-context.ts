import {
  AI_PROVIDERS_GET_CREDENTIALS_CHANNEL,
  AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
  AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL,
} from './ai-providers-channels';

export function exposeAIProvidersContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  
  contextBridge.exposeInMainWorld("aiProviders", {
    getCredentials: () => 
      ipcRenderer.invoke(AI_PROVIDERS_GET_CREDENTIALS_CHANNEL),
    
    saveCredential: (providerId: string, providerData: any) => 
      ipcRenderer.invoke(AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL, providerId, providerData),
    
    deleteCredential: (providerId: string) => 
      ipcRenderer.invoke(AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL, providerId),
  });
}
