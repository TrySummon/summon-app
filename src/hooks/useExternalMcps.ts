import { useQuery, useQueryClient } from "@tanstack/react-query";
import { McpServerState } from "@/helpers/mcp/state";
import { useEffect } from "react";
import { getAllMcpServerStatuses } from "@/helpers/ipc/mcp/mcp-client";
import { onExternalMcpServersUpdated } from "@/helpers/ipc/external-mcp/external-mcp-client";

// Query key for External MCPs
export const EXTERNAL_MCPS_QUERY_KEY = "externalMcps";

export function useExternalMcps() {
  const queryClient = useQueryClient();

  // Fetch all external MCPs using react-query
  const {
    data: externalMcps = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [EXTERNAL_MCPS_QUERY_KEY],
    queryFn: async () => {
      const response = await getAllMcpServerStatuses();
      if (!response.success) {
        throw new Error(response.message || "Failed to fetch external MCPs");
      }

      const externalMcps: Record<string, McpServerState> = {};
      Object.values(response.data || {}).forEach((mcp) => {
        if (mcp.isExternal) {
          externalMcps[mcp.mcpId] = mcp;
        }
      });

      return externalMcps;
    },
  });

  useEffect(() => {
    // Add IPC listener using the contextBridge API
    // This uses the exposed IPC event listener from external-mcp-context-exposer.ts
    const unsubscribe = onExternalMcpServersUpdated((updatedMcps) => {
      // Update the query cache with the new data
      queryClient.setQueryData([EXTERNAL_MCPS_QUERY_KEY], updatedMcps);
    });

    // Clean up on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [queryClient]);

  return {
    externalMcps,
    isLoading,
    error,
    refetch,
  };
}
