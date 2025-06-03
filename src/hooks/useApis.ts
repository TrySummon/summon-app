import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listApis,
  getApi,
  deleteApi,
  renameApi,
} from "@/helpers/ipc/openapi/openapi-client";

export const LIST_API_QUERY_KEY = "list_apis";
export const GET_API_QUERY_KEY = "get_api";

export function useApis() {
  const queryClient = useQueryClient();

  // Query to fetch all APIs
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [LIST_API_QUERY_KEY],
    queryFn: async () => {
      const result = await listApis();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch APIs");
      }
      return result.apis || [];
    },
  });

  // Mutation to delete an API
  const deleteApiMutation = useMutation({
    mutationFn: (apiId: string) => deleteApi(apiId),
    onSuccess: () => {
      // Invalidate the APIs query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [LIST_API_QUERY_KEY] });
    },
  });

  // Mutation to rename an API
  const renameApiMutation = useMutation({
    mutationFn: ({ apiId, newName }: { apiId: string; newName: string }) =>
      renameApi(apiId, newName),
    onSuccess: () => {
      // Invalidate the APIs query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: [LIST_API_QUERY_KEY] });
    },
  });

  return {
    apis: data || [],
    isLoading,
    isError,
    error,
    refetch,
    deleteApi: deleteApiMutation.mutate,
    renameApi: renameApiMutation.mutate,
  };
}

export function useApi(apiId: string) {
  // Query to fetch all APIs
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [GET_API_QUERY_KEY, apiId],
    queryFn: async () => {
      const result = await getApi(apiId);
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch APIs");
      }
      return result.api;
    },
  });

  return {
    api: data,
    isLoading,
    isError,
    error,
    refetch,
  };
}
