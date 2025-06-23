import { captureEvent } from "@/lib/posthog";
import { McpData } from "@/lib/db/mcp-db";
import { recurseCountKeys } from "@/lib/object";

// MCP operations with PostHog instrumentation
export const createMcp = async (
  mcpData: Omit<McpData, "id" | "createdAt" | "updatedAt">,
) => {
  captureEvent("mcp_create", {
    apiCount: mcpData.apiGroups?.length ?? 0,
    mockCount: Object.values(mcpData.apiGroups ?? []).reduce(
      (acc, apiGroup) => acc + (apiGroup.useMockData ? 1 : 0),
      0,
    ),
    toolCount: Object.values(mcpData.apiGroups ?? []).reduce(
      (acc, apiGroup) => acc + (apiGroup.tools?.length ?? 0),
      0,
    ),
  });
  return window.mcpApi.createMcp(mcpData);
};

export const listMcps = async () => {
  return window.mcpApi.listMcps();
};

export const getMcp = async (id: string) => {
  return window.mcpApi.getMcp(id);
};

export const updateMcp = async (
  id: string,
  mcpData: Omit<McpData, "id" | "createdAt" | "updatedAt">,
) => {
  captureEvent("mcp_update", {
    apiCount: mcpData.apiGroups?.length ?? 0,
    mockCount: Object.values(mcpData.apiGroups ?? []).reduce(
      (acc, apiGroup) => acc + (apiGroup.useMockData ? 1 : 0),
      0,
    ),
    toolCount: Object.values(mcpData.apiGroups ?? []).reduce(
      (acc, apiGroup) => acc + (apiGroup.tools?.length ?? 0),
      0,
    ),
  });
  return window.mcpApi.updateMcp(id, mcpData);
};

export const deleteMcp = async (id: string) => {
  captureEvent("mcp_delete");
  return window.mcpApi.deleteMcp(id);
};

// MCP server operations with PostHog instrumentation
export const getMcpServerStatus = async (id: string) => {
  return window.mcpApi.getMcpServerStatus(id);
};

export const getAllMcpServerStatuses = async () => {
  return window.mcpApi.getAllMcpServerStatuses();
};

export const startMcpServer = async (id: string) => {
  captureEvent("mcp_start_server");
  return window.mcpApi.startMcpServer(id);
};

export const stopMcpServer = async (id: string) => {
  captureEvent("mcp_stop_server");
  return window.mcpApi.stopMcpServer(id);
};

export const restartMcpServer = async (id: string) => {
  captureEvent("mcp_restart_server");
  return window.mcpApi.restartMcpServer(id);
};

export const getMcpTools = async (id: string) => {
  return window.mcpApi.getMcpTools(id);
};

export const callMcpTool = async (
  mcpId: string,
  toolName: string,
  args: Record<string, unknown>,
) => {
  const result = await window.mcpApi.callMcpTool(mcpId, toolName, args);

  captureEvent("mcp_call_tool", {
    argsCount: Object.keys(args).length,
    argsKeyCount: recurseCountKeys(args),
    success: result.success,
  });

  return result;
};

export const openUserDataMcpJsonFile = async () => {
  captureEvent("mcp_open_user_data_mcp_json_file");
  return window.mcpApi.openUserDataMcpJsonFile();
};

export const downloadMcpZip = async (id: string) => {
  captureEvent("mcp_download_zip");
  return window.mcpApi.downloadMcpZip(id);
};

export const showFileInFolder = async (filePath: string) => {
  return window.mcpApi.showFileInFolder(filePath);
};
