import { useState, useMemo, useEffect } from "react";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import useToolMap from "@/hooks/useToolMap";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export function useToolSidebar() {
  const { mcpToolMap } = useToolMap();

  const enabledTools = usePlaygroundStore(
    (state) => state.getCurrentState().enabledTools,
  );
  const toolSelectionPristine = usePlaygroundStore(
    (state) => state.getCurrentState().toolSelectionPristine,
  );

  const updateMcpToolMap = usePlaygroundStore(
    (state) => state.updateMcpToolMap,
  );
  const getTabs = usePlaygroundStore((state) => state.getTabs);
  const updateTab = usePlaygroundStore((state) => state.updateTab);
  const updateEnabledTools = usePlaygroundStore(
    (state) => state.updateEnabledTools,
  );
  const setToolSelectionPristine = usePlaygroundStore(
    (state) => state.setToolSelectionPristine,
  );
  // State for expanded MCP sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Save origToolMap to the store when it changes, enable all tools for tabs with undefined enabledTools,
  // and remove tools that are no longer available
  useEffect(() => {
    // First, update the store with the new origToolMap
    updateMcpToolMap(mcpToolMap);

    // If we have tools available, check each tab
    if (mcpToolMap && Object.keys(mcpToolMap).length > 0) {
      const tabs = getTabs();
      // For each tab, process its enabledTools
      Object.entries(tabs).forEach(([tabId, tab]) => {
        // Case 1: enabledTools is undefined - enable all tools
        if (tab.state.enabledTools === undefined) {
          // Create a map of all available tools
          const allTools: Record<string, string[]> = {};

          // For each MCP, add all its tools to the enabledTools object
          Object.entries(mcpToolMap).forEach(([mcpId, mcpData]) => {
            const tools = mcpData.tools as Tool[];
            allTools[mcpId] = tools.map((tool: Tool) => tool.name);
          });

          updateTab(tabId, {
            ...tab,
            state: {
              ...tab.state,
              enabledTools: allTools,
            },
          });
        }
      });
    }
  }, [mcpToolMap, updateMcpToolMap, getTabs, updateTab]);

  // Auto-enable all tools if tool selection is pristine
  useEffect(() => {
    if (
      toolSelectionPristine &&
      mcpToolMap &&
      Object.keys(mcpToolMap).length > 0
    ) {
      // Enable all available tools
      Object.entries(mcpToolMap).forEach(([mcpId, mcpData]) => {
        const tools = mcpData.tools as Tool[];
        const allToolIds = tools.map((tool: Tool) => tool.name);
        updateEnabledTools(mcpId, allToolIds);
      });

      // Set pristine to false after auto-enabling
      setToolSelectionPristine(false);
    }
  }, [
    toolSelectionPristine,
    mcpToolMap,
    updateEnabledTools,
    setToolSelectionPristine,
  ]);

  // Toggle section expansion
  const toggleSection = (mcpId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [mcpId]: !prev[mcpId],
    }));
  };

  // Calculate the number of selected tools per MCP
  const selectedToolCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    Object.entries(enabledTools).forEach(([mcpId, toolIds]) => {
      // Get available tools for this MCP
      const mcpData = mcpToolMap?.[mcpId];
      if (mcpData) {
        const availableTools = mcpData.tools as Tool[];
        const availableToolIds = availableTools.map((tool) => tool.name);

        // Only count tools that actually exist in the MCP
        const validToolIds = toolIds.filter((toolId) =>
          availableToolIds.includes(toolId),
        );
        counts[mcpId] = validToolIds.length;
      } else {
        counts[mcpId] = 0;
      }
    });

    return counts;
  }, [enabledTools, mcpToolMap]);

  // Handle toggling a single tool
  const handleToggleTool = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const isSelected = currentToolsForMcp.includes(toolId);

    let updatedTools: string[];

    if (isSelected) {
      // Remove tool if already selected
      updatedTools = currentToolsForMcp.filter((id) => id !== toolId);
    } else {
      // Add tool if not selected
      updatedTools = [...currentToolsForMcp, toolId];
    }

    updateEnabledTools(mcpId, updatedTools);
  };

  // Handle toggling all tools for an MCP
  const handleToggleAllTools = (mcpId: string, tools: Tool[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map((tool) => tool.name);

    // If all tools are already selected, deselect all
    // Otherwise, select all
    const allSelected = allToolIds.every((id) =>
      currentToolsForMcp.includes(id),
    );

    if (allSelected) {
      updateEnabledTools(mcpId, []);
    } else {
      updateEnabledTools(mcpId, allToolIds);
    }
  };

  // Check if all tools for an MCP are selected
  const areAllToolsSelected = (mcpId: string, tools: Tool[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map((tool) => tool.name);

    return allToolIds.every((id) => currentToolsForMcp.includes(id));
  };

  // Check if a specific tool is selected
  const isToolSelected = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    return currentToolsForMcp.includes(toolId);
  };

  // Calculate total tool count (only count tools that exist in their MCPs)
  const toolCount = useMemo(() => {
    if (!enabledTools || !mcpToolMap) return 0;

    return Object.entries(enabledTools).reduce((acc, [mcpId, toolIds]) => {
      // Get available tools for this MCP
      const mcpData = mcpToolMap[mcpId];
      if (mcpData) {
        const availableTools = mcpData.tools as Tool[];
        const availableToolIds = availableTools.map((tool) => tool.name);

        // Only count tools that actually exist in the MCP
        const validToolIds = toolIds.filter((toolId) =>
          availableToolIds.includes(toolId),
        );
        return acc + validToolIds.length;
      }
      return acc;
    }, 0);
  }, [enabledTools, mcpToolMap]);

  // Filter MCPs that have tools
  const mcps = mcpToolMap
    ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(mcpToolMap).filter(([_, mcpData]) => {
        const tools = mcpData.tools as Tool[];
        return tools && tools.length > 0;
      })
    : [];

  return {
    mcps,
    toolCount,
    expandedSections,
    selectedToolCounts,
    toggleSection,
    handleToggleTool,
    handleToggleAllTools,
    areAllToolsSelected,
    isToolSelected,
    mcpToolMap,
  };
}
