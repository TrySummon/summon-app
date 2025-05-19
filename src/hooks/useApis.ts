import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listApis, deleteApi, renameApi } from '@/helpers/ipc/openapi/openapi-client';

export const API_QUERY_KEY = 'apis';

export function useApis() {
  const queryClient = useQueryClient();

  // Query to fetch all APIs
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: [API_QUERY_KEY],
    queryFn: async () => {
      const result = await listApis();
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch APIs');
      }
      return result.apis || [];
    }
  });

  // Mutation to delete an API
  const deleteApiMutation = useMutation({
    mutationFn: (apiId: string) => deleteApi(apiId),
    onSuccess: () => {
      // Invalidate the APIs query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEY] });
    }
  });

  // Mutation to rename an API
  const renameApiMutation = useMutation({
    mutationFn: ({ apiId, newName }: { apiId: string; newName: string }) => renameApi(apiId, newName),
    onSuccess: () => {
      // Invalidate the APIs query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEY] });
    }
  });

  return {
    apis: data || [],
    isLoading,
    isError,
    error,
    refetch,
    deleteApi: deleteApiMutation.mutate,
    renameApi: renameApiMutation.mutate
  };
}
