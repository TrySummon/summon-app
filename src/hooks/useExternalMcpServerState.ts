import { useState, useEffect } from "react";
import { McpServerState } from "@/helpers/mcp/state";
import { getMcpServerStatus } from "@/helpers/ipc/mcp/mcp-client";
import {
  connectExternalMcpServer,
  stopExternalMcpServer,
} from "@/helpers/ipc/external-mcp/external-mcp-client";

interface UseExternalMcpServerStateResult {
  state: McpServerState | null;
  isLoading: boolean;
  error: Error | null;
  connectServer: () => Promise<void>;
  disconnectServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for polling and managing external MCP server status
 *
 * @param mcpId The ID of the external MCP server to monitor
 * @param pollingInterval Polling interval in milliseconds (default: 2000)
 * @returns Status information and control functions
 */
export function useExternalMcpServerState(
  mcpId: string,
  pollingInterval = 2000,
): UseExternalMcpServerStateResult {
  const [state, setState] = useState<McpServerState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch the current status
  const fetchStatus = async () => {
    try {
      // We can use the same API as regular MCPs since they share the same state structure
      const response = await getMcpServerStatus(mcpId);
      if (response.success) {
        setState(response.data ? response.data : null);
        if (response.data?.error) {
          setError(new Error(response.data.error));
        }
      } else {
        setError(new Error(response.message || "Failed to get server status"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling when the component mounts
  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const intervalId = setInterval(fetchStatus, pollingInterval);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [mcpId, pollingInterval]);

  // Function to connect to the server
  const connectServer = async () => {
    setIsLoading(true);
    try {
      const response = await connectExternalMcpServer(mcpId);
      if (response.success) {
        setState(response.data || null);
      } else {
        setError(new Error(response.message || "Failed to connect to server"));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to disconnect from the server
  const disconnectServer = async () => {
    setIsLoading(true);
    try {
      const response = await stopExternalMcpServer(mcpId);
      if (response.success) {
        setState(response.data || null);
      } else {
        setError(
          new Error(response.message || "Failed to disconnect from server"),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually refresh the status
  const refreshStatus = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  return {
    state,
    isLoading,
    error,
    connectServer,
    disconnectServer,
    refreshStatus,
  };
}
