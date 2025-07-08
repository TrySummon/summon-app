import { captureEvent } from "@/lib/posthog";
import { McpData } from "@/lib/db/mcp-db";
import { recurseCountKeys } from "@/lib/object";
import { SummonTool, SummonToolRef } from "@/lib/mcp/tools/types";
import { queryClient } from "@/queryClient";
import { MCP_LIST_QUERY_KEY, MCP_QUERY_KEY } from "@/hooks/useMcps";
import { usePlaygroundStore } from "@/stores/playgroundStore";
import { useEvaluationStore } from "@/stores/evaluationStore";

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

export const updateMcpTool = async (tool: SummonTool) => {
  captureEvent("mcp_update_tool");
  const result = await window.mcpApi.updateMcpTool(tool);
  if (result.success && !tool.isExternal) {
    queryClient.invalidateQueries({
      queryKey: [MCP_LIST_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [MCP_QUERY_KEY],
    });
  }
  return result;
};

// Wrapper function that also updates playground store when tool names change
export const updateMcpToolWithStoreSync = async (
  previousName: string,
  tool: SummonTool,
) => {
  // Call the original updateMcpTool function
  const result = await updateMcpTool(tool);

  const newName = result.data;

  // If successful and the tool name changed, update all playground tabs and evaluation datasets
  if (result.success && previousName !== newName) {
    const playgroundStore = usePlaygroundStore.getState();
    const evaluationStore = useEvaluationStore.getState();

    // Update all playground tabs to replace the old tool name with the new one
    const tabs = playgroundStore.getTabs();
    Object.entries(tabs).forEach(([tabId, tab]) => {
      const enabledTools = tab.state.enabledTools;
      const mcpId = tool.mcpId;

      // Check if this MCP has the old tool name enabled
      if (enabledTools[mcpId] && enabledTools[mcpId].includes(previousName)) {
        const updatedToolIds = enabledTools[mcpId].map((toolName) =>
          toolName === previousName ? newName : toolName,
        );

        // Update the tab with the new tool name
        const updatedTab = {
          ...tab,
          state: {
            ...tab.state,
            enabledTools: {
              ...enabledTools,
              [mcpId]: updatedToolIds,
            },
          },
        };
        playgroundStore.updateTab(tabId, updatedTab);
      }
    });

    // Update all evaluation datasets to replace the old tool name with the new one
    const datasets = evaluationStore.datasets;
    Object.entries(datasets).forEach(([datasetId, datasetState]) => {
      const enabledTools = datasetState.enabledTools;
      const mcpId = tool.mcpId;

      // Check if this MCP has the old tool name enabled
      if (enabledTools[mcpId] && enabledTools[mcpId].includes(previousName)) {
        const updatedToolIds = enabledTools[mcpId].map((toolName) =>
          toolName === previousName ? newName : toolName,
        );

        // Update the dataset with the new tool name
        evaluationStore.datasets = {
          ...datasets,
          [datasetId]: {
            ...datasetState,
            enabledTools: {
              ...enabledTools,
              [mcpId]: updatedToolIds,
            },
          },
        };
      }
    });
  }

  return result;
};

export const revertMcpTool = async (tool: SummonToolRef) => {
  captureEvent("mcp_revert_tool");
  const result = await window.mcpApi.revertMcpTool(tool);

  if (result.success && !tool.isExternal) {
    queryClient.invalidateQueries({
      queryKey: [MCP_LIST_QUERY_KEY],
    });
    queryClient.invalidateQueries({
      queryKey: [MCP_QUERY_KEY],
    });
  }
  return result;
};

// Wrapper function that also updates playground store when tool names change during revert
export const revertMcpToolWithStoreSync = async (
  previousName: string,
  tool: SummonToolRef,
) => {
  // Call the original revertMcpTool function
  const result = await revertMcpTool(tool);

  const newName = result.data;

  // If successful and the tool name will change back to original, update all playground tabs and evaluation datasets
  if (result.success && previousName !== newName) {
    const playgroundStore = usePlaygroundStore.getState();
    const evaluationStore = useEvaluationStore.getState();

    // Update all playground tabs to replace the current tool name with the original name
    const tabs = playgroundStore.getTabs();
    Object.entries(tabs).forEach(([tabId, tab]) => {
      const enabledTools = tab.state.enabledTools;
      const mcpId = tool.mcpId;

      // Check if this MCP has the current tool name enabled
      if (enabledTools[mcpId] && enabledTools[mcpId].includes(previousName)) {
        const updatedToolIds = enabledTools[mcpId].map((toolName) =>
          toolName === previousName ? newName : toolName,
        );

        // Update the tab with the original tool name
        const updatedTab = {
          ...tab,
          state: {
            ...tab.state,
            enabledTools: {
              ...enabledTools,
              [mcpId]: updatedToolIds,
            },
          },
        };

        playgroundStore.updateTab(tabId, updatedTab);
      }
    });

    // Update all evaluation datasets to replace the current tool name with the original name
    const datasets = evaluationStore.datasets;
    Object.entries(datasets).forEach(([datasetId, datasetState]) => {
      const enabledTools = datasetState.enabledTools;
      const mcpId = tool.mcpId;

      // Check if this MCP has the current tool name enabled
      if (enabledTools[mcpId] && enabledTools[mcpId].includes(previousName)) {
        const updatedToolIds = enabledTools[mcpId].map((toolName) =>
          toolName === previousName ? newName : toolName,
        );

        // Update the dataset with the original tool name
        evaluationStore.datasets = {
          ...datasets,
          [datasetId]: {
            ...datasetState,
            enabledTools: {
              ...enabledTools,
              [mcpId]: updatedToolIds,
            },
          },
        };
      }
    });
  }

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

export const generateFakeData = async (schema: unknown) => {
  return window.mcpApi.generateFakeData(schema);
};

// MCP prompts operations
export const getMcpPrompts = async (id: string) => {
  return window.mcpApi.getMcpPrompts(id);
};

export const getMcpPrompt = async (
  mcpId: string,
  name: string,
  args?: Record<string, string>,
) => {
  const result = await window.mcpApi.getMcpPrompt(mcpId, name, args);

  captureEvent("mcp_get_prompt", {
    argsCount: Object.keys(args || {}).length,
    success: result.success,
  });

  return result;
};

// MCP resources operations
export const getMcpResources = async (id: string) => {
  return window.mcpApi.getMcpResources(id);
};

export const readMcpResource = async (mcpId: string, uri: string) => {
  const result = await window.mcpApi.readMcpResource(mcpId, uri);

  captureEvent("mcp_read_resource", {
    success: result.success,
  });

  return result;
};

export async function getMcpLogs(mcpId: string): Promise<{
  success: boolean;
  data?: Array<{
    timestamp: string;
    level: string;
    message: string;
    mcpId: string;
    isExternal: boolean;
  }>;
  message?: string;
}> {
  return window.mcpApi.getMcpLogs(mcpId);
}
