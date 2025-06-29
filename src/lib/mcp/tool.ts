import { JSONSchema7 } from "json-schema";
import { MappingConfig } from "@/lib/mcp/mapper";
import { workspaceDb } from "../db/workspace-db";
import path from "path";
import fs from "fs/promises";
import { mcpDb } from "../db/mcp-db";
import { kebabCase } from "./generator/utils";
import { calculateTokenCount } from "../tiktoken";
import { deleteMcpImpl, generateMcpImpl, restartMcpServer } from ".";
import { BrowserWindow } from "electron";
import { EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL } from "@/ipc/external-mcp";
import { runningMcpServers } from "./state";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  annotations?: Record<string, unknown>;
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
  const toolPath = await getExternalMcpToolOverridePath(
    override.mcpId,
    override.originalToolName,
  );
  await fs.writeFile(toolPath, JSON.stringify(override.definition, null, 2));

  // Force a refresh of the external MCPs (relist tools)
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send(
      EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
      runningMcpServers,
    );
  }

  return true;
};

export const updateSummonMcpTool = async (tool: SummonTool) => {
  if (!tool.apiId || !tool.mappingConfig)
    throw new Error("Tool has no apiId or mappingConfig");

  const mcpData = await mcpDb.getMcpById(tool.mcpId);

  if (!mcpData) throw new Error("MCP not found");

  const apiGroup = mcpData.apiGroups[tool.apiId];

  if (!apiGroup) throw new Error("API group not found");

  const toolName = tool.originalToolName;

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
              originalToOptimisedMapping: tool.mappingConfig,
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
};

export const updateMcpTool = async (tool: SummonTool) => {
  if (tool.isExternal) {
    await overrideExternalMcpTool(tool);
  } else {
    await updateSummonMcpTool(tool);
  }
};

export const revertSummonMcpTool = async (tool: SummonTool) => {
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
};

export const revertExternalMcpTool = async (tool: SummonTool) => {
  const toolPath = await getExternalMcpToolOverridePath(
    tool.mcpId,
    tool.originalToolName,
  );
  await fs.unlink(toolPath);

  // Force a refresh of the external MCPs (relist tools)
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send(
      EXTERNAL_MCP_SERVERS_UPDATED_CHANNEL,
      runningMcpServers,
    );
  }
};

export const revertMcpTool = async (tool: SummonTool) => {
  if (tool.isExternal) {
    await revertExternalMcpTool(tool);
  } else {
    await revertSummonMcpTool(tool);
  }
};

export const getExternalMcpToolOverride = async (
  mcpId: string,
  toolName: string,
): Promise<ExternalToolOverride | null> => {
  try {
    const toolPath = await getExternalMcpToolOverridePath(mcpId, toolName);
    const toolContent = await fs.readFile(toolPath, "utf-8");
    const toolDefinition: ToolDefinition = JSON.parse(toolContent);

    return {
      mcpId,
      originalToolName: toolName,
      definition: toolDefinition,
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
      const toolContent = await fs.readFile(toolPath, "utf-8");
      const toolDefinition: ToolDefinition = JSON.parse(toolContent);

      // Create the override object
      const override: ExternalToolOverride = {
        mcpId,
        originalToolName: toolDefinition.name,
        definition: toolDefinition,
      };

      overrides[toolDefinition.name] = override;
    }
  } catch {
    // Tools directory doesn't exist or other error - return empty object
  }

  return overrides;
};
