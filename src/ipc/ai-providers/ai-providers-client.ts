import { captureEvent } from "@/lib/posthog";
import { AIProviderCredential } from "@/components/ai-providers/types";

// AI Providers operations with PostHog instrumentation
export const getCredentials = async () => {
  captureEvent("ai_providers_get_credentials");
  return window.aiProviders.getCredentials();
};

export const saveCredential = async (
  id: string,
  providerData: AIProviderCredential,
) => {
  captureEvent("ai_providers_save_credential", {
    provider_type: providerData.provider,
  });
  return window.aiProviders.saveCredential(id, providerData);
};

export const deleteCredential = async (id: string) => {
  captureEvent("ai_providers_delete_credential");
  return window.aiProviders.deleteCredential(id);
};
