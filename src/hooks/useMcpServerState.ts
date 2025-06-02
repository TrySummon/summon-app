import { useState, useEffect } from 'react';
import { McpServerState } from '@/helpers/mcp/state';
import { useQueryClient } from '@tanstack/react-query';
import { MCP_QUERY_KEY } from './useMcps';
import { EXTERNAL_MCPS_QUERY_KEY } from './useExternalMcps';

interface useMcpServerStateResult {
  state: McpServerState | null;
  isLoading: boolean;
  error: Error | null;
  startServer: () => Promise<void>;
  stopServer: () => Promise<void>;
  restartServer: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for polling and managing MCP server status
 * 
 * @param mcpId The ID of the MCP server to monitor
 * @param pollingInterval Polling interval in milliseconds (default: 5000)
 * @returns Status information and control functions
 */
export function useMcpServerState(
  mcpId: string,
  isExternal?: boolean,
  pollingInterval = 2000
): useMcpServerStateResult {
  const [state, setState] = useState<McpServerState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const queryClient = useQueryClient();

  // Function to fetch the current status
  const fetchStatus = async () => {
    try {
      const response = await window.mcpApi.getMcpServerStatus(mcpId);
      if (response.success) {
        setState(response.data ? response.data : null);
        if(response.data?.error) {
          setError(new Error(response.data.error));
        }
      } else {
        setError(new Error(response.message || 'Failed to get server status'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
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

  // Function to start the server
  const startServer = async () => {
    setIsLoading(true);
    try {
      const promise = isExternal ? window.externalMcpApi.connectExternalMcpServer(mcpId, true) : window.mcpApi.startMcpServer(mcpId);
      const response = await promise;
      if (response.success) {
        setState(response.data || null);
        if(isExternal) {
          queryClient.invalidateQueries({ queryKey: [EXTERNAL_MCPS_QUERY_KEY] });
        } else {
          queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
        }
      } else {
        setError(new Error(response.message || 'Failed to start server'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to stop the server
  const stopServer = async () => {
    setIsLoading(true);
    try {
      const fn = isExternal ? window.externalMcpApi.stopExternalMcpServer : window.mcpApi.stopMcpServer;
      const response = await fn(mcpId);
      if (response.success) {
        setState(response.data || null);
        if(isExternal) {
          queryClient.invalidateQueries({ queryKey: [EXTERNAL_MCPS_QUERY_KEY] });
        } else {
          queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
        }
      } else {
        setError(new Error(response.message || 'Failed to stop server'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Function to restart the server
  const restartServer = async () => {
    setIsLoading(true);
    try {
      const response = await window.mcpApi.restartMcpServer(mcpId);
      if (response.success) {
        setState(response.data || null);
      } else {
        setError(new Error(response.message || 'Failed to restart server'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
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
    startServer,
    stopServer,
    restartServer,
    refreshStatus
  };
}
