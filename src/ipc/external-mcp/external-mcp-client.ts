import { captureEvent } from "@/lib/posthog";
import { McpServerState } from "@/lib/mcp/state";

// External MCP operations with PostHog instrumentation
export const connectExternalMcpServer = async (
  mcpId: string,
  force?: boolean,
) => {
  captureEvent("external_mcp_connect", {
    force_connection: !!force,
  });
  return window.externalMcpApi.connectExternalMcpServer(mcpId, force);
};

export const stopExternalMcpServer = async (mcpId: string) => {
  captureEvent("external_mcp_stop");
  return window.externalMcpApi.stopExternalMcpServer(mcpId);
};

export const onExternalMcpServersUpdated = (
  callback: (mcpServers: Record<string, McpServerState>) => void,
) => {
  return window.externalMcpApi.onExternalMcpServersUpdated(callback);
};
