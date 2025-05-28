import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PersistedAIProviderCredential, AIProviderCredential } from '@/components/ai-providers/types';

// Query key for AI providers
export const AI_PROVIDERS_QUERY_KEY = 'aiProviders';

export function useAIProviders() {
  const queryClient = useQueryClient();

  // Fetch all AI providers
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<PersistedAIProviderCredential[]>({
    queryKey: [AI_PROVIDERS_QUERY_KEY],
    queryFn: async () => {
      const result = await window.aiProviders.getCredentials();
      return result;
    }
  });

  // Save a provider credential
  const saveCredential = useMutation({
    mutationFn: async ({ id, providerData }: { id: string, providerData: AIProviderCredential }) => {
      return await window.aiProviders.saveCredential(id, providerData);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    }
  });

  // Delete a provider credential
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      return await window.aiProviders.deleteCredential(id);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    }
  });

  return {
    credentials: data,
    isLoading,
    isError,
    error,
    refetch,
    saveCredential,
    deleteCredential
  };
}
