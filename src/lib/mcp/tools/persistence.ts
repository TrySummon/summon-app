import path from "path";
import fs from "fs/promises";
import { workspaceDb } from "@/lib/db/workspace-db";
import { app, BrowserWindow } from "electron";
import { deleteMcpImpl, generateMcpImpl, restartMcpServer } from "@/lib/mcp";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp";
import type { ExternalToolOverride, SummonToolRef, SummonTool } from "./types";
import { mcpDb } from "@/lib/db/mcp-db";
import { calculateTokenCount } from "@/lib/tiktoken";
import { toHyphenCase } from "@/lib/string";
import { ensureDirectoryExists } from "@/lib/file";
import { datasetDb } from "@/lib/db/dataset-db";
import log from "electron-log/main";

/**
 * Get the directory for external MCP implementations
 */
export async function getExternalMcpDir(mcpId: string): Promise<string> {
  try {
    const currentWorkspace = await workspaceDb.getCurrentWorkspace();
    const workspaceDataDir = workspaceDb.getWorkspaceDataDir(
      currentWorkspace.id,
    );
    return path.join(workspaceDataDir, "external-mcps", mcpId);
  } catch (error) {
    // Fallback to root directory if workspace system fails
    console.error(
      "Failed to get workspace for external MCP, falling back to root:",
      error,
    );
    const userDataPath = app.getPath("userData");
    return path.join(userDataPath, "external-mcps", mcpId);
  }
}

/**
 * Get the directory for external MCP tool overrides
 */
export async function getExternalMcpToolsOverrideDir(
  mcpId: string,
): Promise<string> {
  const mcpImplDir = await getExternalMcpDir(mcpId);
  return path.join(mcpImplDir, "tools");
}

/**
 * Get the path for a specific external MCP tool override
 */
export async function getExternalMcpToolOverridePath(
  mcpId: string,
  toolName: string,
): Promise<string> {
  const toolsDir = await getExternalMcpToolsOverrideDir(mcpId);
  return path.join(toolsDir, `${toHyphenCase(toolName)}.json`);
}

/**
 * Update expected tool calls in dataset items when a tool name changes
 */
async function updateExpectedToolCallsInDatasets(
  oldToolName: string,
  newToolName: string,
): Promise<void> {
  try {
    if (oldToolName === newToolName) {
      return; // No change needed
    }

    const datasets = await datasetDb.listDatasets();
    let updatedCount = 0;

    for (const dataset of datasets) {
      for (const item of dataset.items) {
        if (
          item.expectedToolCalls &&
          item.expectedToolCalls.includes(oldToolName)
        ) {
          // Replace old tool name with new tool name
          const updatedExpectedToolCalls = item.expectedToolCalls.map(
            (toolName) => (toolName === oldToolName ? newToolName : toolName),
          );

          // Update the item in the database
          await datasetDb.updateItem(dataset.id, item.id, {
            expectedToolCalls: updatedExpectedToolCalls,
          });

          updatedCount++;
        }
      }
    }

    log.info(
      `Updated ${updatedCount} dataset items with new tool name: ${oldToolName} -> ${newToolName}`,
    );
  } catch (error) {
    log.error("Error updating expected tool calls in datasets:", error);
  }
}

/**
 * Get the current tool name for an external MCP tool
 */
async function getCurrentExternalToolName(
  mcpId: string,
  originalToolName: string,
): Promise<string> {
  const existingOverride = await getExternalMcpToolOverride(
    mcpId,
    originalToolName,
  );
  return existingOverride?.definition.name || originalToolName;
}

/**
 * Get the current tool name for a summon MCP tool
 */
async function getCurrentSummonToolName(
  mcpId: string,
  apiId: string,
  originalToolName: string,
): Promise<string> {
  const mcpData = await mcpDb.getMcpById(mcpId, true);
  if (!mcpData) {
    throw new Error("MCP not found");
  }

  const apiGroup = mcpData.apiGroups[apiId];
  if (!apiGroup) {
    throw new Error("API group not found");
  }

  const tool = apiGroup.tools?.find((t) => t.name === originalToolName);
  if (!tool) {
    throw new Error("Tool not found");
  }

  const toolName = tool.optimised?.name || tool.name;
  return (apiGroup.toolPrefix || "") + toolName;
}

/**
 * Override an external MCP tool definition
 */
export async function overrideExternalMcpTool(
  override: ExternalToolOverride,
): Promise<string> {
  // Get the current tool name before updating
  const currentToolName = await getCurrentExternalToolName(
    override.mcpId,
    override.originalToolName,
  );

  // Check if there's already an override with the same tool name
  const existingOverrides = await getExternalMcpOverrides(override.mcpId);
  const duplicateOverride = Object.values(existingOverrides).find(
    (existingOverride) =>
      existingOverride.definition.name === override.definition.name &&
      existingOverride.originalToolName !== override.originalToolName,
  );

  if (duplicateOverride) {
    throw new Error(
      `A tool with the name "${override.definition.name}" already exists in this MCP`,
    );
  }

  const toolPath = await getExternalMcpToolOverridePath(
    override.mcpId,
    override.originalToolName,
  );
  await ensureDirectoryExists(path.dirname(toolPath));

  // Remove annotations before saving
  delete override.definition.annotations;

  await fs.writeFile(toolPath, JSON.stringify(override, null, 2));

  // Force a refresh of the external MCPs
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send(EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL, null);
  }

  const newToolName = override.definition.name;

  // Update expected tool calls in datasets
  await updateExpectedToolCallsInDatasets(currentToolName, newToolName);

  return newToolName;
}

/**
 * Get all external MCP tool overrides
 */
export async function getExternalMcpOverrides(
  mcpId: string,
  indexWithOriginalToolName: boolean = true,
): Promise<Record<string, ExternalToolOverride>> {
  const toolsDir = await getExternalMcpToolsOverrideDir(mcpId);
  const overrides: Record<string, ExternalToolOverride> = {};

  try {
    // Check if tools directory exists
    await fs.access(toolsDir);

    // Read all tool override files
    const toolFiles = await fs.readdir(toolsDir);

    for (const toolFile of toolFiles) {
      if (!toolFile.endsWith(".json")) continue;

      const toolPath = path.join(toolsDir, toolFile);
      const content = await fs.readFile(toolPath, "utf-8");
      const override: ExternalToolOverride = JSON.parse(content);

      if (indexWithOriginalToolName) {
        overrides[override.originalToolName] = override;
      } else {
        overrides[override.definition.name] = override;
      }
    }
  } catch {
    // Tools directory doesn't exist or other error - return empty object
  }

  return overrides;
}

/**
 * Get a specific external MCP tool override
 */
export async function getExternalMcpToolOverride(
  mcpId: string,
  toolName: string,
): Promise<ExternalToolOverride | null> {
  try {
    const toolPath = await getExternalMcpToolOverridePath(mcpId, toolName);
    const toolContent = await fs.readFile(toolPath, "utf-8");
    const override: ExternalToolOverride = JSON.parse(toolContent);

    return {
      mcpId,
      originalToolName: override.originalToolName,
      definition: override.definition,
    };
  } catch {
    // File doesn't exist or other error
    return null;
  }
}

export const updateSummonMcpTool = async (tool: SummonTool) => {
  if (!tool.apiId) throw new Error("Tool has no apiId");

  // Get the current tool name before updating
  const currentToolName = await getCurrentSummonToolName(
    tool.mcpId,
    tool.apiId,
    tool.originalToolName,
  );

  const mcpData = await mcpDb.getMcpById(tool.mcpId, true);

  if (!mcpData) throw new Error("MCP not found");

  const apiGroup = mcpData.apiGroups[tool.apiId];

  if (!apiGroup) throw new Error("API group not found");

  const toolName = tool.originalToolName;

  // Check if there's already a tool with the same name (without prefix) in the same API group
  const duplicateTool = apiGroup.tools?.find(
    (existingTool) =>
      existingTool.name !== toolName && // Exclude the tool being updated
      (existingTool.optimised?.name === tool.definition.name ||
        existingTool.name === tool.definition.name),
  );

  if (duplicateTool) {
    throw new Error(
      `A tool with the name "${tool.definition.name}" already exists in this API group`,
    );
  }

  // Calculate token count for the optimized definition
  const optimisedTokenCount = await calculateTokenCount(
    JSON.stringify(tool.definition),
  );

  const updatedApiGroup = {
    ...apiGroup,
    tools:
      apiGroup.tools?.map((t) =>
        t.name === toolName
          ? {
              ...t,
              optimised: tool.definition,
              optimisedTokenCount,
              originalToOptimisedMapping:
                tool.mappingConfig || t.originalToOptimisedMapping,
            }
          : t,
      ) || [],
  };

  const updatedMcpData = {
    ...mcpData,
    apiGroups: {
      ...mcpData.apiGroups,
      [tool.apiId!]: updatedApiGroup,
    },
  };

  // Update the MCP in the database
  await mcpDb.updateMcp(tool.mcpId, updatedMcpData);

  await deleteMcpImpl(tool.mcpId);
  await generateMcpImpl(tool.mcpId);
  await restartMcpServer(tool.mcpId);

  const newToolName = (apiGroup.toolPrefix || "") + tool.definition.name;

  // Update expected tool calls in datasets
  await updateExpectedToolCallsInDatasets(currentToolName, newToolName);

  return newToolName;
};

export const updateMcpTool = async (tool: SummonTool) => {
  if (tool.isExternal) {
    return overrideExternalMcpTool(tool);
  } else {
    return updateSummonMcpTool(tool);
  }
};

export const revertSummonMcpTool = async (tool: SummonToolRef) => {
  if (!tool.apiId) throw new Error("Tool has no apiId");

  // Get the current tool name before reverting
  const currentToolName = await getCurrentSummonToolName(
    tool.mcpId,
    tool.apiId,
    tool.originalToolName,
  );

  const mcpData = await mcpDb.getMcpById(tool.mcpId, true);
  if (!mcpData) throw new Error("MCP not found");

  const apiGroup = mcpData.apiGroups[tool.apiId];

  if (!apiGroup) throw new Error("API group not found");

  const toolName = tool.originalToolName;

  const nextTools = apiGroup.tools?.map((t) => {
    if (t.name === toolName) {
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        optimised,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        optimisedTokenCount,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        originalToOptimisedMapping,
        ...rest
      } = t;
      return rest;
    }
    return t;
  });

  const updatedApiGroup = {
    ...apiGroup,
    tools: nextTools,
  };

  const updatedMcpData = {
    ...mcpData,
    apiGroups: {
      ...mcpData.apiGroups,
      [tool.apiId!]: updatedApiGroup,
    },
  };

  // Update the MCP in the database
  await mcpDb.updateMcp(tool.mcpId, updatedMcpData);

  await deleteMcpImpl(tool.mcpId);
  await generateMcpImpl(tool.mcpId);
  await restartMcpServer(tool.mcpId);

  const newToolName = (apiGroup.toolPrefix || "") + tool.originalToolName;

  // Update expected tool calls in datasets
  await updateExpectedToolCallsInDatasets(currentToolName, newToolName);

  return newToolName;
};

export const revertExternalMcpTool = async (tool: SummonToolRef) => {
  // Get the current tool name before reverting
  const currentToolName = await getCurrentExternalToolName(
    tool.mcpId,
    tool.originalToolName,
  );

  const toolPath = await getExternalMcpToolOverridePath(
    tool.mcpId,
    tool.originalToolName,
  );
  await fs.unlink(toolPath);

  // Force a refresh of the external MCPs (relist tools)
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send(EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL, null);
  }

  const newToolName = tool.originalToolName;

  // Update expected tool calls in datasets
  await updateExpectedToolCallsInDatasets(currentToolName, newToolName);

  return newToolName;
};

export const revertMcpTool = async (tool: SummonToolRef) => {
  if (tool.isExternal) {
    return revertExternalMcpTool(tool);
  } else {
    return revertSummonMcpTool(tool);
  }
};
