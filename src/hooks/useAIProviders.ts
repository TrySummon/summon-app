import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AIProviderCredential } from '@/components/ai-providers/types';

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
  } = useQuery<AIProviderCredential[]>({
    queryKey: [AI_PROVIDERS_QUERY_KEY],
    queryFn: async () => {
      const result = await window.aiProviders.getCredentials();
      return result;
    }
  });

  // Save a provider credential
  const saveCredential = useMutation({
    mutationFn: async ({ providerId, providerData }: { providerId: string, providerData: any }) => {
      return await window.aiProviders.saveCredential(providerId, providerData);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    }
  });

  // Delete a provider credential
  const deleteCredential = useMutation({
    mutationFn: async (providerId: string) => {
      return await window.aiProviders.deleteCredential(providerId);
    },
    onSuccess: () => {
      // Invalidate the query to refetch providers
      queryClient.invalidateQueries({ queryKey: [AI_PROVIDERS_QUERY_KEY] });
    }
  });

  return {
    providers: data,
    isLoading,
    isError,
    error,
    refetch,
    saveCredential,
    deleteCredential
  };
}
