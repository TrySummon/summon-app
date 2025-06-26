import { useState, useMemo, useEffect } from "react";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import useToolMap from "@/hooks/useToolMap";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ModifiedTool } from "@/stores/types";

export function useToolSidebar() {
  const { mcpToolMap } = useToolMap();

  const enabledTools = usePlaygroundStore(
    (state) => state.getCurrentState().enabledTools,
  );
  const toolSelectionPristine = usePlaygroundStore(
    (state) => state.getCurrentState().toolSelectionPristine,
  );
  const modifiedToolMap = usePlaygroundStore(
    (state) => state.getCurrentState().modifiedToolMap,
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
  const modifyTool = usePlaygroundStore((state) => state.modifyTool);
  const revertTool = usePlaygroundStore((state) => state.revertTool);

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
        // Case 2: enabledTools is defined - check for tools that are no longer available
        else if (tab.state.enabledTools) {
          let needsUpdate = false;
          const updatedEnabledTools: Record<string, string[]> = {};

          // For each MCP in the tab's enabledTools
          Object.entries(tab.state.enabledTools).forEach(
            ([mcpId, enabledToolIds]) => {
              // Check if this MCP still exists in origToolMap
              if (mcpToolMap[mcpId]) {
                // Get the available tool IDs for this MCP
                const tools = mcpToolMap[mcpId].tools as Tool[];
                const availableToolIds = tools.map((tool: Tool) => tool.name);

                // Filter out tools that are no longer available
                const validToolIds = enabledToolIds.filter((toolId) =>
                  availableToolIds.includes(toolId),
                );

                // If some tools were removed, mark for update
                if (validToolIds.length !== enabledToolIds.length) {
                  needsUpdate = true;
                }

                // Only add this MCP if it has valid tools
                if (validToolIds.length > 0) {
                  updatedEnabledTools[mcpId] = validToolIds;
                } else {
                  needsUpdate = true; // MCP had tools but now has none valid
                }
              } else {
                // MCP no longer exists, mark for update
                needsUpdate = true;
              }
            },
          );

          // If we need to update the tab's enabledTools
          if (needsUpdate) {
            updateTab(tabId, {
              ...tab,
              state: {
                ...tab.state,
                enabledTools: updatedEnabledTools,
              },
            });
          }
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

  // Initialize all sections as expanded
  useEffect(() => {
    if (mcpToolMap && Object.keys(mcpToolMap).length > 0) {
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(mcpToolMap).forEach((mcpId) => {
        initialExpandedState[mcpId] = true;
      });
      setExpandedSections(initialExpandedState);
    }
  }, [mcpToolMap]);

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
      counts[mcpId] = toolIds.length;
    });

    return counts;
  }, [enabledTools]);

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

  // Get modified name for a tool
  const getModifiedName = (
    mcpId: string,
    toolName: string,
    originalName: string,
  ) => {
    const modification = modifiedToolMap[mcpId]?.[toolName];
    return modification?.name || originalName;
  };

  // Get modified tool
  const getModifiedTool = (
    mcpId: string,
    toolName: string,
  ): ModifiedTool | undefined => {
    return modifiedToolMap[mcpId]?.[toolName];
  };

  // Calculate total tool count
  const toolCount = Object.values(enabledTools).reduce(
    (acc, tools) => acc + tools.length,
    0,
  );

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
    modifiedToolMap,
    toggleSection,
    handleToggleTool,
    handleToggleAllTools,
    areAllToolsSelected,
    isToolSelected,
    getModifiedName,
    getModifiedTool,
    revertTool,
    modifyTool,
    mcpToolMap,
  };
}
