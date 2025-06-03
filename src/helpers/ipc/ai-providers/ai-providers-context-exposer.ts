import { contextBridge, ipcRenderer } from "electron";
import { AIProviderCredential } from "@/components/ai-providers/types";
import {
  AI_PROVIDERS_GET_CREDENTIALS_CHANNEL,
  AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
  AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL,
} from "./ai-providers-channels";

export function exposeAIProvidersContext() {
  contextBridge.exposeInMainWorld("aiProviders", {
    getCredentials: () => {
      return ipcRenderer.invoke(AI_PROVIDERS_GET_CREDENTIALS_CHANNEL);
    },

    saveCredential: (id: string, providerData: AIProviderCredential) => {
      return ipcRenderer.invoke(
        AI_PROVIDERS_SAVE_CREDENTIAL_CHANNEL,
        id,
        providerData,
      );
    },

    deleteCredential: (id: string) => {
      return ipcRenderer.invoke(AI_PROVIDERS_DELETE_CREDENTIAL_CHANNEL, id);
    },
  });
}
