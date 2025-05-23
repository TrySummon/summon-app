import { useState, useEffect } from 'react';
import { 
  getMcpServerStatus,
  startMcpServer,
  stopMcpServer,
  restartMcpServer 
} from '@/helpers/ipc/mcp/mcp-client';
import { McpServerStatus } from '@/helpers/mcp';

interface UseMcpServerStatusResult {
  status: McpServerStatus | null;
  url: string | null;
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
export function useMcpServerStatus(
  mcpId: string,
  pollingInterval = 2000
): UseMcpServerStatusResult {
  const [status, setStatus] = useState<McpServerStatus | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch the current status
  const fetchStatus = async () => {
    try {
      const response = await getMcpServerStatus(mcpId);
      if (response.success) {
        setStatus(response.data ? response.data.status : null);
        setUrl(response.data ? `http://localhost:${response.data.port}/mcp` : null);
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
      const response = await startMcpServer(mcpId);
      if (response.success) {
        setStatus(response.data?.status || null);
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
      const response = await stopMcpServer(mcpId);
      if (response.success) {
        setStatus(response.data ? response.data.status : 'stopped');
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
      const response = await restartMcpServer(mcpId);
      if (response.success) {
        setStatus(response.data?.status || null);
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
    status,
    url,
    isLoading,
    error,
    startServer,
    stopServer,
    restartServer,
    refreshStatus
  };
}
