import { ToolInvocation } from "ai";
import { AgentToolBox, ToolClassification, ToolResult } from "@/types/agent";
import {
  searchApiEndpoints,
  listApis,
  optimiseToolSize as agentOptimiseToolSize,
} from "@/ipc/agent-tools/agent-tools-client";
import { getMcp, updateMcp } from "@/ipc/mcp/mcp-client";
import { convertEndpointToTool } from "@/ipc/openapi/openapi-client";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { toast } from "sonner";
import { captureEvent } from "@/lib/posthog";
import { OptimizeToolSizeRequest } from "@/lib/mcp/tools";
import { queryClient } from "@/queryClient";
import { MCP_LIST_QUERY_KEY, MCP_QUERY_KEY } from "@/hooks/useMcps";
import { McpData, McpApiGroup } from "@/lib/db/mcp-db";
import { McpToolDefinitionWithoutAuth } from "@/lib/mcp/types";
import { dispatchToolAnimation } from "@/hooks/useMcpActions";

export class McpBuilderToolBox implements AgentToolBox {
  private mcpId: string;

  constructor(mcpId: string) {
    this.mcpId = mcpId;
  }

  getToolClassification(toolName: string): ToolClassification | null {
    const toolClassifications: Record<string, ToolClassification> = {
      // Read-only tools (auto-execute)
      listApis: {
        type: "read",
        runningText: "Retrieving available APIs...",
        doneText: "Found APIs",
        errorText: "Failed to retrieve APIs",
      },
      listMcpTools: {
        type: "read",
        runningText: "Listing MCP tools...",
        doneText: "Found MCP tools",
        errorText: "Failed to list MCP tools",
      },
      searchApiEndpoints: {
        type: "read",
        runningText: "Searching API endpoints...",
        doneText: "Found API endpoints",
        errorText: "Failed to search API endpoints",
      },

      // Write tools (require approval)
      addTools: {
        type: "write",
        runningText: "Adding MCP tools...",
        doneText: "Successfully added tools",
        errorText: "Failed to add tools",
      },
      optimiseToolSize: {
        type: "write",
        runningText: "Optimising tool definition...",
        doneText: "Optimised tool definition",
        errorText: "Failed to optimise tool definition",
      },
      removeMcpTool: {
        type: "write",
        runningText: "Removing MCP tool...",
        doneText: "Successfully removed tool",
        errorText: "Failed to remove tool",
      },
      removeAllTools: {
        type: "write",
        runningText: "Removing all MCP tools...",
        doneText: "Successfully removed all tools",
        errorText: "Failed to remove tools",
      },
    };

    return toolClassifications[toolName] || null;
  }

  async executeReadTool(toolInvocation: ToolInvocation): Promise<ToolResult> {
    try {
      let result: ToolResult;

      // Execute the appropriate read tool based on the tool name
      switch (toolInvocation.toolName) {
        case "listApis": {
          result = await listApis();
          break;
        }

        case "searchApiEndpoints": {
          result = await searchApiEndpoints(toolInvocation.args);
          break;
        }

        case "listMcpTools": {
          result = await this.listMcpTools(toolInvocation.args?.apiId);
          break;
        }

        default:
          throw new Error(`Unknown read tool: ${toolInvocation.toolName}`);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  async executeWriteTool(toolInvocation: ToolInvocation): Promise<ToolResult> {
    try {
      let result: ToolResult;

      // Execute the appropriate tool based on the tool name
      switch (toolInvocation.toolName) {
        case "addTools": {
          result = await this.addToolsToMcp(
            toolInvocation.args.selectedEndpoints,
          );
          break;
        }

        case "optimiseToolSize": {
          result = await this.optimiseToolSize(toolInvocation.args);
          break;
        }

        case "removeMcpTool": {
          result = await this.removeMcpTool(
            toolInvocation.args.apiId,
            toolInvocation.args.toolName,
          );
          break;
        }

        case "removeAllTools": {
          result = await this.removeAllMcpTools();
          break;
        }

        default:
          throw new Error(`Unknown write tool: ${toolInvocation.toolName}`);
      }

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  private async getMcp() {
    const response = await getMcp(this.mcpId);
    if (!response.success || !response.mcp) {
      throw new Error("MCP not found");
    }
    return response.mcp;
  }

  private async updateMcpApiGroups(apiGroups: Record<string, McpApiGroup>) {
    const mcp = await this.getMcp();

    await updateMcp(this.mcpId, {
      ...mcp,
      apiGroups,
    });

    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: [MCP_LIST_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
  }

  private async listMcpTools(apiId?: string): Promise<ToolResult> {
    try {
      const mcp = await this.getMcp();

      // Return all tools from all API groups
      const allTools: Array<{ apiId: string; [key: string]: unknown }> = [];

      Object.entries(mcp.apiGroups).forEach(([groupApiId, apiGroup]) => {
        if (apiId && groupApiId !== apiId) {
          return;
        }

        if (apiGroup.tools) {
          const toolsWithApiId = apiGroup.tools.map((tool) => ({
            name: tool.optimised?.name || tool.name,
            description: tool.description,
            originalTokenCount: tool.originalTokenCount,
            isOptimised: !!tool.optimised,
            apiId: groupApiId,
          }));
          allTools.push(...toolsWithApiId);
        }
      });

      return {
        success: true,
        message: JSON.stringify(allTools),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async addToolsToMcp(
    selectedEndpoints: {
      apiId: string;
      endpointPath: string;
      endpointMethod: string;
    }[],
  ): Promise<ToolResult> {
    try {
      const mcp = await this.getMcp();

      // Group endpoints by apiId
      const endpointsByApiId = new Map<string, SelectedEndpoint[]>();

      selectedEndpoints.forEach((endpoint) => {
        const { apiId, endpointPath, endpointMethod } = endpoint;
        if (!endpointsByApiId.has(apiId)) {
          endpointsByApiId.set(apiId, []);
        }

        // Convert to SelectedEndpoint format
        const selectedEndpoint: SelectedEndpoint = {
          path: endpointPath,
          method: endpointMethod.toLowerCase(),
        };

        endpointsByApiId.get(apiId)!.push(selectedEndpoint);
      });

      const toolResults = await Promise.all(
        Array.from(endpointsByApiId.entries()).map(([apiId, endpoints]) =>
          this.onAddEndpoints(mcp, apiId, endpoints),
        ),
      );

      return {
        success: true,
        message: JSON.stringify(toolResults),
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async onAddEndpoints(
    mcp: McpData,
    apiId: string,
    endpoints: SelectedEndpoint[],
  ): Promise<ToolResult> {
    const tools = await Promise.all(
      endpoints.map((endpoint) => convertEndpointToTool(apiId, endpoint)),
    );

    const convertedTools = tools
      .filter((tool) => !!tool.data)
      .map((tool) => tool.data!);

    tools
      .filter((tool) => !tool.data)
      .forEach((tool) => {
        toast.error(tool.message);
      });

    // Get all existing tool names across all API groups
    const existingToolNames = new Set<string>();
    Object.values(mcp.apiGroups).forEach((group: McpApiGroup) => {
      group.tools?.forEach((tool: McpToolDefinitionWithoutAuth) => {
        existingToolNames.add(tool.name);
      });
    });

    // Filter out duplicate tools and warn about them
    const newTools = convertedTools.filter((tool) => {
      if (existingToolNames.has(tool.name)) {
        toast.info(`Skipped "${tool.name}": Duplicate tool name found.`);
        return false;
      }
      return true;
    });

    const nextApiGroups = { ...mcp.apiGroups };

    // Create default API group if it doesn't exist
    if (!nextApiGroups[apiId]) {
      nextApiGroups[apiId] = {
        name: apiId,
        useMockData: true,
        toolPrefix: "",
        auth: { type: "noAuth" },
        tools: [],
      };
    }

    nextApiGroups[apiId] = {
      ...nextApiGroups[apiId],
      tools: [...(nextApiGroups[apiId]?.tools || []), ...newTools],
    };

    // Dispatch animation events for new tools
    newTools.forEach((tool: McpToolDefinitionWithoutAuth) => {
      dispatchToolAnimation(tool.name, this.mcpId, "added");
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.updateMcpApiGroups(nextApiGroups);

    return {
      success: true,
      message: JSON.stringify(
        newTools.map((tool: McpToolDefinitionWithoutAuth) => ({
          name: tool.name,
          apiId: tool.apiId,
          tokenCount: tool.originalTokenCount,
        })),
      ),
    };
  }

  private async removeMcpTool(
    _apiId: string,
    toolName: string,
  ): Promise<ToolResult> {
    try {
      const mcp = await this.getMcp();

      // Find and remove the tool from all API groups
      let toolFound = false;
      const nextApiGroups = { ...mcp.apiGroups };

      Object.keys(nextApiGroups).forEach((apiId) => {
        const group = nextApiGroups[apiId];
        const prefix = group.toolPrefix || "";
        const searchToolName = toolName.startsWith(prefix)
          ? toolName.replace(prefix, "")
          : toolName;

        if (group.tools) {
          // Check for both the exact tool name and the tool name with prefix removed
          const toolIndex = group.tools.findIndex(
            (tool: McpToolDefinitionWithoutAuth) => {
              return tool.name === searchToolName;
            },
          );

          if (toolIndex !== -1) {
            toolFound = true;

            const updatedTools = group.tools.filter(
              (tool: McpToolDefinitionWithoutAuth) => {
                // Match against the original tool name (without prefix)
                const originalToolName =
                  prefix && tool.name.startsWith(prefix)
                    ? tool.name.substring(prefix.length)
                    : tool.name;
                return (
                  originalToolName !== searchToolName &&
                  tool.name !== searchToolName
                );
              },
            );

            // If no tools left after deletion, remove the entire API group
            if (updatedTools.length === 0) {
              delete nextApiGroups[apiId];
            } else {
              nextApiGroups[apiId] = {
                ...group,
                tools: updatedTools,
              };
            }
          }
        }
      });

      if (!toolFound) {
        console.warn(`Tool "${toolName}" not found in any API group.`);
        return { success: false, message: `Tool "${toolName}" not found` };
      }

      // Dispatch animation event before deleting (use the full tool name with prefix)
      dispatchToolAnimation(toolName, this.mcpId, "deleted");

      await new Promise((resolve) => setTimeout(resolve, 500));

      await this.updateMcpApiGroups(nextApiGroups);

      return {
        success: true,
        message: `Successfully deleted tool: ${toolName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async removeAllMcpTools(): Promise<ToolResult> {
    try {
      // Remove all API groups since deleting all tools would leave them empty
      await this.updateMcpApiGroups({});

      return {
        success: true,
        message: `Successfully deleted all tools`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async optimiseToolSize(
    args: Omit<OptimizeToolSizeRequest, "mcpId">,
  ): Promise<ToolResult> {
    captureEvent("optimize_tool_size");

    dispatchToolAnimation(args.toolName, this.mcpId, "start-update");
    try {
      const result = await agentOptimiseToolSize({
        mcpId: this.mcpId,
        ...args,
      });

      if (result.success) {
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: [MCP_LIST_QUERY_KEY] });
        queryClient.invalidateQueries({ queryKey: [MCP_QUERY_KEY] });
      }

      return result;
    } finally {
      dispatchToolAnimation(args.toolName, this.mcpId, "end-update");
    }
  }
}
