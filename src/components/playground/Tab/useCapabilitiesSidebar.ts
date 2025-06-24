import { useState, useMemo, useEffect } from "react";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import useCapabilitiesMap from "@/hooks/useCapabilitiesMap";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import { ModifiedTool } from "@/stores/types";
import { Prompt, Resource } from "@/types/mcp";

export function useCapabilitiesSidebar() {
  const { mcpCapabilitiesMap, mcpToolMap } = useCapabilitiesMap();

  const enabledTools = usePlaygroundStore(
    (state) => state.getCurrentState().enabledTools,
  );
  const enabledPrompts = usePlaygroundStore(
    (state) => state.getCurrentState().enabledPrompts,
  );
  const enabledResources = usePlaygroundStore(
    (state) => state.getCurrentState().enabledResources,
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
  const updateEnabledPrompts = usePlaygroundStore(
    (state) => state.updateEnabledPrompts,
  );
  const updateEnabledResources = usePlaygroundStore(
    (state) => state.updateEnabledResources,
  );
  const modifyTool = usePlaygroundStore((state) => state.modifyTool);
  const revertTool = usePlaygroundStore((state) => state.revertTool);

  // State for expanded MCP sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  // Save mcpToolMap to the store when it changes, enable all tools for tabs with undefined enabledTools,
  // and remove tools that are no longer available
  useEffect(() => {
    // First, update the store with the new mcpToolMap
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
              // Check if this MCP still exists in mcpToolMap
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

  // Initialize all sections as expanded
  useEffect(() => {
    if (mcpCapabilitiesMap && Object.keys(mcpCapabilitiesMap).length > 0) {
      const initialExpandedState: Record<string, boolean> = {};
      Object.keys(mcpCapabilitiesMap).forEach((mcpId) => {
        initialExpandedState[mcpId] = true;
      });
      setExpandedSections(initialExpandedState);
    }
  }, [mcpCapabilitiesMap]);

  // Toggle section expansion
  const toggleSection = (mcpId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [mcpId]: !prev[mcpId],
    }));
  };

  // Calculate the number of selected items per MCP
  const selectedCounts = useMemo(() => {
    const counts: Record<
      string,
      { tools: number; prompts: number; resources: number; total: number }
    > = {};

    if (mcpCapabilitiesMap) {
      Object.keys(mcpCapabilitiesMap).forEach((mcpId) => {
        const toolCount = enabledTools[mcpId]?.length || 0;
        const promptCount = enabledPrompts[mcpId]?.length || 0;
        const resourceCount = enabledResources[mcpId]?.length || 0;

        counts[mcpId] = {
          tools: toolCount,
          prompts: promptCount,
          resources: resourceCount,
          total: toolCount + promptCount + resourceCount,
        };
      });
    }

    return counts;
  }, [enabledTools, enabledPrompts, enabledResources, mcpCapabilitiesMap]);

  // Handle toggling capabilities
  const handleToggleTool = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const isSelected = currentToolsForMcp.includes(toolId);

    let updatedTools: string[];
    if (isSelected) {
      updatedTools = currentToolsForMcp.filter((id) => id !== toolId);
    } else {
      updatedTools = [...currentToolsForMcp, toolId];
    }

    updateEnabledTools(mcpId, updatedTools);
  };

  // Handle toggling all tools for an MCP at once
  const handleToggleAllTools = (mcpId: string, tools: Tool[]) => {
    const allToolIds = tools.map((tool) => tool.name);

    // Use the same logic as areAllToolsSelected for consistency
    const allSelected = areAllToolsSelected(mcpId, tools);

    if (allSelected) {
      // Deselect all tools
      updateEnabledTools(mcpId, []);
    } else {
      // Select all tools
      updateEnabledTools(mcpId, allToolIds);
    }
  };

  // Handle toggling all prompts for an MCP at once
  const handleToggleAllPrompts = (mcpId: string, prompts: Prompt[]) => {
    const allPromptIds = prompts.map((prompt) => prompt.name);

    // Check if all prompts are currently selected
    const allSelected = areAllPromptsSelected(mcpId, prompts);

    if (allSelected) {
      // Deselect all prompts
      updateEnabledPrompts(mcpId, []);
    } else {
      // Select all prompts
      updateEnabledPrompts(mcpId, allPromptIds);
    }
  };

  // Handle toggling all resources for an MCP at once
  const handleToggleAllResources = (mcpId: string, resources: Resource[]) => {
    const allResourceIds = resources.map((resource) => resource.uri);

    // Check if all resources are currently selected
    const allSelected = areAllResourcesSelected(mcpId, resources);

    if (allSelected) {
      // Deselect all resources
      updateEnabledResources(mcpId, []);
    } else {
      // Select all resources
      updateEnabledResources(mcpId, allResourceIds);
    }
  };

  const handleTogglePrompt = (mcpId: string, promptId: string) => {
    const currentPromptsForMcp = enabledPrompts[mcpId] || [];
    const isSelected = currentPromptsForMcp.includes(promptId);

    let updatedPrompts: string[];
    if (isSelected) {
      updatedPrompts = currentPromptsForMcp.filter((id) => id !== promptId);
    } else {
      updatedPrompts = [...currentPromptsForMcp, promptId];
    }

    updateEnabledPrompts(mcpId, updatedPrompts);
  };

  const handleToggleResource = (mcpId: string, resourceId: string) => {
    const currentResourcesForMcp = enabledResources[mcpId] || [];
    const isSelected = currentResourcesForMcp.includes(resourceId);

    let updatedResources: string[];
    if (isSelected) {
      updatedResources = currentResourcesForMcp.filter(
        (id) => id !== resourceId,
      );
    } else {
      updatedResources = [...currentResourcesForMcp, resourceId];
    }

    updateEnabledResources(mcpId, updatedResources);
  };

  // Check selection status
  const isToolSelected = (mcpId: string, toolId: string) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    return currentToolsForMcp.includes(toolId);
  };

  // Check if all tools for an MCP are selected
  const areAllToolsSelected = (mcpId: string, tools: Tool[]) => {
    if (tools.length === 0) return false;
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map((tool) => tool.name);
    return allToolIds.every((toolId) => currentToolsForMcp.includes(toolId));
  };

  // Check if all prompts for an MCP are selected
  const areAllPromptsSelected = (mcpId: string, prompts: Prompt[]) => {
    if (prompts.length === 0) return false;
    const currentPromptsForMcp = enabledPrompts[mcpId] || [];
    const allPromptIds = prompts.map((prompt) => prompt.name);
    return allPromptIds.every((promptId) =>
      currentPromptsForMcp.includes(promptId),
    );
  };

  // Check if all resources for an MCP are selected
  const areAllResourcesSelected = (mcpId: string, resources: Resource[]) => {
    if (resources.length === 0) return false;
    const currentResourcesForMcp = enabledResources[mcpId] || [];
    const allResourceIds = resources.map((resource) => resource.uri);
    return allResourceIds.every((resourceId) =>
      currentResourcesForMcp.includes(resourceId),
    );
  };

  const isPromptSelected = (mcpId: string, promptId: string) => {
    const currentPromptsForMcp = enabledPrompts[mcpId] || [];
    return currentPromptsForMcp.includes(promptId);
  };

  const isResourceSelected = (mcpId: string, resourceId: string) => {
    const currentResourcesForMcp = enabledResources[mcpId] || [];
    return currentResourcesForMcp.includes(resourceId);
  };

  // Get modified tool information (for tools only)
  const getModifiedName = (
    mcpId: string,
    toolName: string,
    originalName: string,
  ) => {
    const modification = modifiedToolMap[mcpId]?.[toolName];
    return modification?.name || originalName;
  };

  const getModifiedTool = (
    mcpId: string,
    toolName: string,
  ): ModifiedTool | undefined => {
    return modifiedToolMap[mcpId]?.[toolName];
  };

  // Calculate total counts
  const totalCounts = useMemo(() => {
    const totals = { tools: 0, prompts: 0, resources: 0, all: 0 };

    Object.values(selectedCounts).forEach((counts) => {
      totals.tools += counts.tools;
      totals.prompts += counts.prompts;
      totals.resources += counts.resources;
      totals.all += counts.total;
    });

    return totals;
  }, [selectedCounts]);

  // Filter MCPs that have any capabilities
  const mcps = mcpCapabilitiesMap
    ? Object.entries(mcpCapabilitiesMap).filter(([_, mcpData]) => {
        const hasTools = mcpData.tools && mcpData.tools.length > 0;
        const hasPrompts = mcpData.prompts && mcpData.prompts.length > 0;
        const hasResources = mcpData.resources && mcpData.resources.length > 0;
        return hasTools || hasPrompts || hasResources;
      })
    : [];

  return {
    mcps,
    totalCounts,
    selectedCounts,
    expandedSections,
    modifiedToolMap,
    toggleSection,
    handleToggleTool,
    handleToggleAllTools,
    handleToggleAllPrompts,
    handleToggleAllResources,
    handleTogglePrompt,
    handleToggleResource,
    isToolSelected,
    areAllToolsSelected,
    areAllPromptsSelected,
    areAllResourcesSelected,
    isPromptSelected,
    isResourceSelected,
    getModifiedName,
    getModifiedTool,
    revertTool,
    modifyTool,
    mcpCapabilitiesMap,
  };
}
