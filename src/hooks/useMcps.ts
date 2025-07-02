import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { McpData, McpSubmitData } from "@/lib/db/mcp-db";
import {
  createMcp,
  deleteMcp,
  getMcp,
  listMcps,
  updateMcp,
} from "@/ipc/mcp/mcp-client";

// Query key for MCPs
export const MCP_LIST_QUERY_KEY = "mcps";
export const MCP_QUERY_KEY = "mcp";

export function useMcp(mcpId: string | undefined) {
  // Fetch a single MCP by ID
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [MCP_QUERY_KEY, mcpId],
    queryFn: async () => {
      if (!mcpId) {
        throw new Error("MCP ID is required");
      }
      const result = await getMcp(mcpId);
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch MCP");
      }
      return result;
    },
    enabled: !!mcpId,
  });

  return {
    mcp: data?.mcp as McpData | undefined,
    isLoading,
    isError,
    error,
    refetch,
  };
}

export function useMcps() {
  const queryClient = useQueryClient();

  const invalidateMcps = () => {
    queryClient.invalidateQueries({
      queryKey: [MCP_LIST_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [MCP_QUERY_KEY],
    });
  };

  // Fetch all MCPs
  const {
    data = { mcps: [] },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [MCP_LIST_QUERY_KEY],
    queryFn: async () => {
      const result = await listMcps();
      if (!result.success) {
        throw new Error(result.message || "Failed to fetch MCPs");
      }
      return result;
    },
  });

  const createMcpMutation = useMutation({
    mutationFn: async ({ mcpData }: { mcpData: McpSubmitData }) => {
      const result = await createMcp(mcpData);
      if (!result.success) {
        throw new Error(result.message || "Failed to create MCP");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MCP_LIST_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [MCP_QUERY_KEY],
      });
    },
  });

  // Update an MCP
  const updateMcpMutation = useMutation({
    mutationFn: async ({
      mcpId,
      mcpData,
    }: {
      mcpId: string;
      mcpData: McpSubmitData;
    }) => {
      const result = await updateMcp(mcpId, mcpData);
      if (!result.success) {
        throw new Error(result.message || "Failed to update MCP");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MCP_LIST_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [MCP_QUERY_KEY],
      });
    },
  });

  // Delete an MCP
  const deleteMcpMutation = useMutation({
    mutationFn: async (mcpId: string) => {
      const result = await deleteMcp(mcpId);
      if (!result.success) {
        throw new Error(result.message || "Failed to delete MCP");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MCP_LIST_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [MCP_QUERY_KEY],
      });
    },
  });

  return {
    mcps: data.mcps as McpData[],
    isLoading,
    isError,
    error,
    invalidateMcps,
    refetch,
    createMcp: createMcpMutation.mutate,
    updateMcp: updateMcpMutation.mutate,
    deleteMcp: deleteMcpMutation.mutate,
  };
}
