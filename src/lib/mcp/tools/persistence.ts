import path from "path";
import fs from "fs/promises";
import { workspaceDb } from "@/lib/db/workspace-db";
import { app, BrowserWindow } from "electron";
import {
  ensureDirectoryExists,
  deleteMcpImpl,
  generateMcpImpl,
  restartMcpServer,
} from "@/lib/mcp";
import { kebabCase } from "@/lib/mcp/generator/utils";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp";
import type { ExternalToolOverride, SummonToolRef, SummonTool } from "./types";
import { mcpDb } from "@/lib/db/mcp-db";
import { calculateTokenCount } from "@/lib/tiktoken";

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
  return path.join(toolsDir, `${kebabCase(toolName)}.json`);
}

/**
 * Override an external MCP tool definition
 */
export async function overrideExternalMcpTool(
  override: ExternalToolOverride,
): Promise<string> {
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

  return override.definition.name;
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

  return (apiGroup.toolPrefix || "") + tool.definition.name;
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

  return (apiGroup.toolPrefix || "") + tool.originalToolName;
};

export const revertExternalMcpTool = async (tool: SummonToolRef) => {
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

  return tool.originalToolName;
};

export const revertMcpTool = async (tool: SummonToolRef) => {
  if (tool.isExternal) {
    return revertExternalMcpTool(tool);
  } else {
    return revertSummonMcpTool(tool);
  }
};
