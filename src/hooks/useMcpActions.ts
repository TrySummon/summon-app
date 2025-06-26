import { useCallback } from "react";
import { useMcps } from "./useMcps";
import { useApis } from "./useApis";
import { SelectedEndpoint } from "@/lib/mcp/parser/extract-tools";
import { toast } from "sonner";
import { convertEndpointToTool } from "@/ipc/openapi/openapi-client";

export function useMcpActions(mcpId: string) {
  const { mcps, updateMcp } = useMcps();
  const { apis } = useApis();
  const mcp = mcps.find((m) => m.id === mcpId);

  const onAddEndpoints = useCallback(
    async (apiId: string, endpoints: SelectedEndpoint[]) => {
      if (!mcp) return;

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

      updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });
    },
    [mcp, apis, updateMcp],
  );

  const onDeleteTool = useCallback(
    (toolName: string) => {
      if (!mcp) return;

      // Find and remove the tool from all API groups
      let toolFound = false;
      const nextApiGroups = { ...mcp.apiGroups };
      Object.keys(nextApiGroups).forEach((apiId) => {
        const group = nextApiGroups[apiId];
        const prefix = group.toolPrefix || "";
        toolName = toolName.startsWith(prefix)
          ? toolName.replace(prefix, "")
          : toolName;
        if (group.tools) {
          // Check for both the exact tool name and the tool name with prefix removed
          const toolIndex = group.tools.findIndex((tool) => {
            return tool.name === toolName;
          });

          if (toolIndex !== -1) {
            toolFound = true;
            const updatedTools = group.tools.filter((tool) => {
              // Match against the original tool name (without prefix)
              const originalToolName =
                prefix && tool.name.startsWith(prefix)
                  ? tool.name.substring(prefix.length)
                  : tool.name;
              return originalToolName !== toolName && tool.name !== toolName;
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
        return;
      }

      updateMcp({
        mcpId: mcp.id,
        mcpData: {
          ...mcp,
          apiGroups: nextApiGroups,
        },
      });
    },
    [mcp, updateMcp],
  );

  const onDeleteAllTools = useCallback(() => {
    if (!mcp) return;

    // Remove all API groups since deleting all tools would leave them empty
    updateMcp({
      mcpId: mcp.id,
      mcpData: {
        ...mcp,
        apiGroups: {},
      },
    });
  }, [mcp, updateMcp]);

  return {
    onAddEndpoints,
    onDeleteTool,
    onDeleteAllTools,
  };
}
