import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { McpData, McpSubmitData } from "@/lib/db/mcp-db";
import {
  createMcp,
  deleteMcp,
  listMcps,
  updateMcp,
} from "@/ipc/mcp/mcp-client";

// Query key for MCPs
export const MCP_QUERY_KEY = "mcps";

export function useMcps() {
  const queryClient = useQueryClient();

  // Fetch all MCPs
  const {
    data = { mcps: [] },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [MCP_QUERY_KEY],
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
      queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
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
      queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
    },
  });

  return {
    mcps: data.mcps as McpData[],
    isLoading,
    isError,
    error,
    refetch,
    createMcp: createMcpMutation.mutate,
    updateMcp: updateMcpMutation.mutate,
    deleteMcp: deleteMcpMutation.mutate,
  };
}
