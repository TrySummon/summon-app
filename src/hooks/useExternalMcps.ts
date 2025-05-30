import { useState, useEffect } from 'react';
import { McpServerState } from '@/helpers/mcp/state';

export function useExternalMcps() {
  const [externalMcps, setExternalMcps] = useState<Record<string, McpServerState>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExternalMcps = () => {
    setIsLoading(true);
    setError(null);
    window.mcpApi.getAllMcpServerStatuses().then((response) => {
      if (response.success) {
        const externalMcps: Record<string, McpServerState> = {}
        Object.values(response.data || {}).forEach((mcp) => {
          if (mcp.isExternal) {
            externalMcps[mcp.mcpId] = mcp;
          }
        });
        setExternalMcps(externalMcps);
      } else {
        setError(new Error(response.message || 'Failed to fetch external MCPs'));
      }
    }).catch((error) => {
      setError(error instanceof Error ? error : new Error('Unknown error'));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(() => {  
    fetchExternalMcps();
    // Add IPC listener using the contextBridge API
    // This uses the exposed IPC event listener from external-mcp-context-exposer.ts
    const unsubscribe = window.externalMcpApi.onExternalMcpServersUpdated(setExternalMcps);
    
    // Clean up on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    externalMcps,
    isLoading,
    error,
    refetch: fetchExternalMcps
  };
}
