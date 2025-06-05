import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PersistedAIProviderCredential,
  AIProviderCredential,
} from "@/components/ai-providers/types";
import {
  getCredentials,
  saveCredential as _saveCredential,
  deleteCredential as _deleteCredential,
} from "@/ipc/ai-providers/ai-providers-client";

// Query key for AI providers
export const AI_PROVIDERS_QUERY_KEY = "aiProviders";

export function useAIProviders() {
  const queryClient = useQueryClient();

  // Fetch all AI providers
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PersistedAIProviderCredential[]>({
    queryKey: [AI_PROVIDERS_QUERY_KEY],
    queryFn: async () => {
      const result = await getCredentials();
      return result;
    },
  });

  // Save a provider credential
  const saveCredential = useMutation({
    mutationFn: async ({
      id,
      providerData,
    }: {
      id: string;
      providerData: AIProviderCredential;
    }) => {
      return await _saveCredential(id, providerData);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    },
  });

  // Delete a provider credential
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      return await _deleteCredential(id);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    },
  });

  return {
    credentials: data,
    isLoading,
    isError,
    error,
    refetch,
    saveCredential,
    deleteCredential,
  };
}
