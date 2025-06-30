import { useCallback } from "react";
import { useMcp, useMcps } from "./useMcps";
import { useApis } from "./useApis";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { toast } from "sonner";
import { convertEndpointToTool } from "@/ipc/openapi/openapi-client";
import type { OptimiseToolSizeRequest } from "@/ipc/agent-tools/agent-tools-listeners";

// Custom event types for tool animations
export interface ToolAnimationEvent extends CustomEvent {
  detail: {
    toolName: string;
    mcpId: string;
    animationType:
      | "added"
      | "deleted"
      | "updated"
      | "start-update"
      | "end-update";
  };
}

// Helper function to dispatch tool animation events
export const dispatchToolAnimation = (
  toolName: string,
  mcpId: string,
  animationType:
    | "added"
    | "deleted"
    | "updated"
    | "start-update"
    | "end-update",
) => {
  const event = new CustomEvent("tool-animation", {
    detail: { toolName, mcpId, animationType },
  }) as ToolAnimationEvent;
  window.dispatchEvent(event);
};

export function useMcpActions(mcpId: string) {
  const { mcp } = useMcp(mcpId);
  const { updateMcp, invalidateMcps } = useMcps();
  const { apis } = useApis();

  const onAddEndpoints = useCallback(
    async (apiId: string, endpoints: SelectedEndpoint[]) => {
      if (!mcp) return { success: false, message: "MCP not found" };

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
      Object.values(mcp.apiGroups).forEach((group) => {
        group.tools?.forEach((tool) => {
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
      newTools.forEach((tool) => {
        dispatchToolAnimation(tool.name, mcpId, "added");
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });

      return {
        success: true,
        message: JSON.stringify(
          newTools.map((tool) => ({
            name: tool.name,
            apiId: tool.apiId,
            tokenCount: tool.originalTokenCount,
          })),
        ),
      };
    },
    [mcp, apis, updateMcp, mcpId],
  );

  const onDeleteTool = useCallback(
    async (toolName: string) => {
      if (!mcp) return { success: false, message: "MCP not found" };

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
          const toolIndex = group.tools.findIndex((tool) => {
            return tool.name === searchToolName;
          });

          if (toolIndex !== -1) {
            toolFound = true;

            const updatedTools = group.tools.filter((tool) => {
              // Match against the original tool name (without prefix)
              const originalToolName =
                prefix && tool.name.startsWith(prefix)
                  ? tool.name.substring(prefix.length)
                  : tool.name;
              return (
                originalToolName !== searchToolName &&
                tool.name !== searchToolName
              );
            });

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
      dispatchToolAnimation(toolName, mcpId, "deleted");

      await new Promise((resolve) => setTimeout(resolve, 500));

      await updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });

      return {
        success: true,
        message: `Successfully deleted tool: ${toolName}`,
      };
    },
    [mcp, updateMcp, mcpId],
  );

  const onDeleteAllTools = useCallback(async () => {
    if (!mcp) return { success: false, message: "MCP not found" };

    // Remove all API groups since deleting all tools would leave them empty
    await updateMcp({
      mcpId: mcp.id,
      mcpData: {
        ...mcp,
        apiGroups: {},
      },
    });

    return {
      success: true,
      message: `Successfully deleted all tools`,
    };
  }, [mcp, updateMcp, mcpId]);

  const optimiseToolSize = useCallback(
    async (args: Omit<OptimiseToolSizeRequest, "mcpId">) => {
      dispatchToolAnimation(args.toolName, mcpId, "start-update");
      const result = await window.agentTools.optimiseToolSize({
        mcpId,
        ...args,
      });
      dispatchToolAnimation(args.toolName, mcpId, "end-update");
      if (result.success) {
        invalidateMcps();
      }
      return result;
    },
    [mcpId],
  );

  return {
    optimiseToolSize,
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
  };
}
