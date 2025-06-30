import { JSONSchema7 } from "json-schema";
import { MappingConfig } from "@/lib/mcp/mapper";
import { workspaceDb } from "../db/workspace-db";
import path from "path";
import fs from "fs/promises";
import { mcpDb } from "../db/mcp-db";
import { kebabCase } from "./generator/utils";
import { calculateTokenCount } from "../tiktoken";
import {
  deleteMcpImpl,
  ensureDirectoryExists,
  generateMcpImpl,
  restartMcpServer,
} from ".";
import { BrowserWindow } from "electron";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp";

export interface ToolAnnotations {
  tokenCount?: number;
  optimisedTokenCount?: number;
  id: string;
  prefix?: string;
  isExternal?: boolean;
  apiId?: string;
  originalDefinition?: ToolDefinition;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  annotations?: ToolAnnotations;
}

export interface ExternalToolOverride {
  mcpId: string;
  originalToolName: string;
  definition: ToolDefinition;
}

export interface SummonTool {
  apiId?: string;
  mappingConfig?: MappingConfig;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
  definition: ToolDefinition;
}

export interface SummonToolRef {
  apiId?: string;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
}

export type ExternalMcpOverrides = Record<
  string,
  Record<string, ExternalToolOverride>
>;

export const getExternalMcpsDir = async () => {
  const currentWorkspace = await workspaceDb.getCurrentWorkspace();
  const workspaceDataDir = workspaceDb.getWorkspaceDataDir(currentWorkspace.id);
  return path.join(workspaceDataDir, "external-mcps");
};

export const getExternalMcpDir = async (mcpId: string) => {
  const externalMcpsDir = await getExternalMcpsDir();
  const mcpImplDir = path.join(externalMcpsDir, mcpId);

  return mcpImplDir;
};

export const getExternalMcpToolsOverrideDir = async (mcpId: string) => {
  const mcpImplDir = await getExternalMcpDir(mcpId);
  return path.join(mcpImplDir, "tools");
};

export const getExternalMcpToolOverridePath = async (
  mcpId: string,
  toolName: string,
) => {
  const toolsDir = await getExternalMcpToolsOverrideDir(mcpId);
  return path.join(toolsDir, `${kebabCase(toolName)}.json`);
};

export const overrideExternalMcpTool = async (
  override: ExternalToolOverride,
) => {
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

  delete override.definition.annotations;

  await fs.writeFile(toolPath, JSON.stringify(override, null, 2));

  // Force a refresh of the external MCPs (relist tools)
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send(EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL, null);
  }

  return override.definition.name;
};

export const updateSummonMcpTool = async (tool: SummonTool) => {
  if (!tool.apiId) throw new Error("Tool has no apiId");

  const mcpData = await mcpDb.getMcpById(tool.mcpId);

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
  const mcpData = await mcpDb.getMcpById(tool.mcpId);
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

export const getExternalMcpToolOverride = async (
  mcpId: string,
  toolName: string,
): Promise<ExternalToolOverride | null> => {
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
    // File doesn't exist or other error - return null
    return null;
  }
};

export const getExternalMcpOverrides = async (
  mcpId: string,
): Promise<Record<string, ExternalToolOverride>> => {
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

      overrides[override.originalToolName] = override;
    }
  } catch {
    // Tools directory doesn't exist or other error - return empty object
  }

  return overrides;
};
