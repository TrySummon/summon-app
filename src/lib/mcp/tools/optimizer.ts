import axios from "axios";
import log from "electron-log";
import { authStorage } from "@/ipc/auth/auth-listeners";
import { calculateTokenCount } from "@/lib/tiktoken";
import { mcpDb } from "@/lib/db/mcp-db";
import type { JSONSchema7 } from "json-schema";
import type {
  ToolDefinition,
  OptimizeToolSizeRequest,
  OptimizeToolSelectionRequest,
  OptimizeToolSelectionResult,
  ToolAnnotations,
} from "./types";
import { getMcpTools } from "./fetcher";
import { type MappingConfig } from "@/lib/mcp/tools/mapper";
import { updateMcpTool } from "./persistence";

/**
 * Optimize a single tool's size/definition
 */
export async function optimizeToolSize(
  request: OptimizeToolSizeRequest,
): Promise<{ success: boolean; message?: string; tokenCount?: number }> {
  const { mcpId, apiId, toolName, additionalGoal } = request;
  const authData = await authStorage.getAuthData();

  if (!authData) {
    return { success: false, message: "Not authenticated" };
  }

  const isExternal = !apiId;
  let originalToolDefinition: ToolDefinition;

  if (isExternal) {
    // Handle external MCP tools
    const tools = await getMcpTools(mcpId);
    const tool = tools.find((t) => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        message: `Tool with name ${toolName} not found`,
      };
    }

    const annotations = tool.annotations as unknown as ToolAnnotations;
    originalToolDefinition = annotations.originalDefinition || {
      name: tool.name,
      description: tool.description || "",
      inputSchema: tool.inputSchema as unknown as JSONSchema7,
    };
  } else {
    // Handle internal MCP tools
    const mcpData = await mcpDb.getMcpById(mcpId);
    if (!mcpData) {
      return {
        success: false,
        message: `MCP with ID ${mcpId} not found`,
      };
    }

    const apiGroup = mcpData.apiGroups[apiId];
    const tool = apiGroup?.tools?.find(
      (t) => t.name === toolName || t.optimised?.name === toolName,
    );

    if (!tool) {
      return {
        success: false,
        message: `Tool with name ${toolName} not found`,
      };
    }

    originalToolDefinition = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema as unknown as JSONSchema7,
    };
  }

  try {
    // Make request to optimization endpoint
    const response = await axios.post(
      `${process.env.PUBLIC_SUMMON_HOST}/api/optimise-tool-size`,
      {
        originalToolDefinition,
        additionalGoal,
      },
      {
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    if (
      !response.data?.improvedToolDefinition ||
      !response.data?.mappingConfig
    ) {
      return {
        success: false,
        message:
          "Failed to optimize tool definition - incomplete response from server",
      };
    }

    // Parse the optimized tool definition and mapping config
    const optimizedToolDefinition: ToolDefinition = JSON.parse(
      response.data.improvedToolDefinition,
    );
    const mappingConfig: MappingConfig = JSON.parse(
      response.data.mappingConfig,
    );

    // Update the tool
    await updateMcpTool({
      apiId,
      mappingConfig,
      mcpId,
      isExternal,
      originalToolName: originalToolDefinition.name,
      definition: optimizedToolDefinition,
    });

    const optimisedTokenCount = await calculateTokenCount(
      JSON.stringify(optimizedToolDefinition, null, 2),
    );

    return {
      success: true,
      message: `Tool "${toolName}" has been optimized successfully`,
      tokenCount: optimisedTokenCount,
    };
  } catch (error) {
    log.error(`Failed to optimize tool ${toolName}:`, error);
    return {
      success: false,
      message: `Failed to optimize tool: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Optimize tool selection based on context
 */
export async function optimizeToolSelection(
  request: OptimizeToolSelectionRequest,
): Promise<{
  success: boolean;
  message?: string;
  data?: OptimizeToolSelectionResult;
}> {
  const { context, messagesPriorToToolCall, tools } = request;
  const authData = await authStorage.getAuthData();

  if (!authData) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    const originalTools = tools.map((tool) => tool.definition);

    // Make request to tool selection optimization endpoint
    const response = await axios.post(
      `${process.env.PUBLIC_SUMMON_HOST}/api/optimise-tool-selection`,
      {
        context,
        originalTools,
        messagesPriorToToolCall,
      },
      {
        headers: {
          Authorization: `Bearer ${authData.token}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      },
    );

    if (response.data.success === false) {
      return {
        success: false,
        message: "Failed to optimize tool definition: " + response.data.message,
      };
    }

    const result = response.data as Array<{
      originalToolName: string;
      updatedTool: ToolDefinition;
    }>;

    // Map the optimized tools back to the original format
    const optimised = result.map((toolUpdate) => {
      const toolDefinition = toolUpdate.updatedTool;
      const toolName = toolUpdate.originalToolName;
      const toolIndex = tools.findIndex((t) => t.definition.name === toolName);

      if (toolIndex === -1) {
        throw new Error(
          `Tool ${toolName} does not exist in the original tools`,
        );
      }

      return {
        ...tools[toolIndex],
        definition: toolDefinition,
      };
    });

    // Clean up annotations for comparison
    tools.forEach((tool) => {
      delete tool.definition.annotations;
    });

    optimised.forEach((tool) => {
      delete tool.definition.annotations;
    });

    return {
      success: true,
      data: {
        original: tools,
        optimised,
      },
    };
  } catch (error) {
    log.error(`Error optimising tool selection:`, error);

    if (axios.isAxiosError(error)) {
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
