import { create } from "zustand";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import useToolMap from "@/hooks/useToolMap";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { useMemo } from "react";
import { IModelConfiguration } from "@/components/llm-picker/LLMPicker";
import { EvaluationSummary } from "@/lib/evaluation/runner";

interface EvaluationProgressType {
  completed: number;
  total: number;
  currentItem: string;
}

interface DatasetEvaluationState {
  enabledTools: Record<string, string[]>; // mcpId -> toolNames[]
  expandedMcps: Record<string, boolean>; // mcpId -> boolean
  agentModelConfig: IModelConfiguration;
  assertionModelConfig: IModelConfiguration;
  selectedItems: Set<string>;
  isRunning: boolean;
  progress: EvaluationProgressType | null;
  results: EvaluationSummary | null;
  showItemSelection: boolean;
}

interface EvaluationStore {
  datasets: Record<string, DatasetEvaluationState>; // datasetId -> state

  // Actions
  getDatasetState: (datasetId: string) => DatasetEvaluationState;
  initializeDataset: (datasetId: string, itemIds?: string[]) => void;
  toggleMcpExpanded: (datasetId: string, mcpId: string) => void;
  toggleTool: (datasetId: string, mcpId: string, toolName: string) => void;
  toggleAllMcpTools: (
    datasetId: string,
    mcpId: string,
    mcpToolMap: Record<string, { name: string; tools: Tool[] }>,
  ) => void;
  isToolSelected: (
    datasetId: string,
    mcpId: string,
    toolName: string,
  ) => boolean;

  initializeExpandedMcps: (
    datasetId: string,
    mcpToolMap: Record<string, { name: string; tools: Tool[] }>,
  ) => void;
  setAgentModelConfig: (datasetId: string, config: IModelConfiguration) => void;
  setAssertionModelConfig: (
    datasetId: string,
    config: IModelConfiguration,
  ) => void;
  setSelectedItems: (datasetId: string, items: Set<string>) => void;
  initializeSelectedItems: (datasetId: string, itemIds: string[]) => void;
  setIsRunning: (datasetId: string, isRunning: boolean) => void;
  setProgress: (
    datasetId: string,
    progress: EvaluationProgressType | null,
  ) => void;
  setResults: (datasetId: string, results: EvaluationSummary | null) => void;
  setShowItemSelection: (datasetId: string, show: boolean) => void;
  selectItem: (datasetId: string, itemId: string, checked: boolean) => void;
  handleSelectAllItems: (datasetId: string, itemIds: string[]) => void;
  handleSelectNoItems: (datasetId: string) => void;
}

// Create default state for a dataset
function createDefaultDatasetState(itemIds?: string[]): DatasetEvaluationState {
  const defaultModelConfig = {
    settings: {
      temperature: 0.7,
      maxTokens: 4096,
      presencePenalty: 0,
    },
  };

  return {
    enabledTools: {},
    expandedMcps: {},
    agentModelConfig: defaultModelConfig,
    assertionModelConfig: defaultModelConfig,
    selectedItems: itemIds ? new Set(itemIds) : new Set(),
    isRunning: false,
    progress: null,
    results: null,
    showItemSelection: false,
  };
}

// Define the state that will be persisted to storage
type EvaluationStorePersist = {
  datasets: Record<
    string,
    Omit<DatasetEvaluationState, "selectedItems"> & {
      selectedItems: string[]; // Convert Set to array for serialization
    }
  >;
};

// Configure persist options
const persistOptions: PersistOptions<EvaluationStore, EvaluationStorePersist> =
  {
    name: "evaluation-store",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      datasets: Object.fromEntries(
        Object.entries(state.datasets).map(([datasetId, datasetState]) => [
          datasetId,
          {
            ...datasetState,
            selectedItems: Array.from(datasetState.selectedItems),
          },
        ]),
      ),
    }),
    onRehydrateStorage: () => (state) => {
      if (state) {
        // Convert arrays back to Sets
        const datasetsWithSets: Record<string, DatasetEvaluationState> = {};
        Object.entries(state.datasets || {}).forEach(
          ([datasetId, datasetState]) => {
            datasetsWithSets[datasetId] = {
              ...datasetState,
              selectedItems: new Set(datasetState.selectedItems || []),
            };
          },
        );
        (state as EvaluationStore).datasets = datasetsWithSets;
      }
    },
  };

export const useEvaluationStore = create<EvaluationStore>()(
  persist(
    (set, get) => ({
      datasets: {},

      getDatasetState: (datasetId) => {
        const state = get().datasets[datasetId];
        if (!state) {
          // Auto-initialize if not found
          get().initializeDataset(datasetId);
          return get().datasets[datasetId];
        }
        return state;
      },

      initializeDataset: (datasetId, itemIds) => {
        set((state) => {
          if (!state.datasets[datasetId]) {
            return {
              datasets: {
                ...state.datasets,
                [datasetId]: createDefaultDatasetState(itemIds),
              },
            };
          }
          return state;
        });
      },

      initializeExpandedMcps: (datasetId, mcpToolMap) => {
        const datasetState = get().getDatasetState(datasetId);
        const hasExistingState =
          Object.keys(datasetState.expandedMcps).length > 0;

        if (
          !hasExistingState &&
          mcpToolMap &&
          Object.keys(mcpToolMap).length > 0
        ) {
          const expanded: Record<string, boolean> = {};
          Object.keys(mcpToolMap).forEach((mcpId) => {
            expanded[mcpId] = true;
          });
          set((state) => ({
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...state.datasets[datasetId],
                expandedMcps: expanded,
              },
            },
          }));
        }
      },

      toggleMcpExpanded: (datasetId, mcpId) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              expandedMcps: {
                ...datasetState.expandedMcps,
                [mcpId]: !datasetState.expandedMcps[mcpId],
              },
            },
          },
        }));
      },

      toggleTool: (datasetId, mcpId, toolName) => {
        const datasetState = get().getDatasetState(datasetId);
        const mcpTools = datasetState.enabledTools[mcpId] || [];
        const isSelected = mcpTools.includes(toolName);

        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              enabledTools: {
                ...datasetState.enabledTools,
                [mcpId]: isSelected
                  ? mcpTools.filter((name) => name !== toolName)
                  : [...mcpTools, toolName],
              },
            },
          },
        }));
      },

      toggleAllMcpTools: (datasetId, mcpId, mcpToolMap) => {
        if (!mcpToolMap?.[mcpId]) return;

        const datasetState = get().getDatasetState(datasetId);
        const tools = mcpToolMap[mcpId].tools as Tool[];
        const allToolNames = tools.map((tool) => tool.name);
        const currentTools = datasetState.enabledTools[mcpId] || [];
        const allSelected = allToolNames.every((name) =>
          currentTools.includes(name),
        );

        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              enabledTools: {
                ...datasetState.enabledTools,
                [mcpId]: allSelected ? [] : allToolNames,
              },
            },
          },
        }));
      },

      isToolSelected: (datasetId, mcpId, toolName) => {
        const datasetState = get().getDatasetState(datasetId);
        return (datasetState.enabledTools[mcpId] || []).includes(toolName);
      },

      setAgentModelConfig: (datasetId, config) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              agentModelConfig: config,
            },
          },
        }));
      },

      setAssertionModelConfig: (datasetId, config) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              assertionModelConfig: config,
            },
          },
        }));
      },

      setSelectedItems: (datasetId, items) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              selectedItems: items,
            },
          },
        }));
      },

      initializeSelectedItems: (datasetId, itemIds) => {
        const datasetState = get().getDatasetState(datasetId);
        if (datasetState.selectedItems.size === 0) {
          set((state) => ({
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...datasetState,
                selectedItems: new Set(itemIds),
              },
            },
          }));
        }
      },

      setIsRunning: (datasetId, isRunning) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              isRunning,
            },
          },
        }));
      },

      setProgress: (datasetId, progress) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              progress,
            },
          },
        }));
      },

      setResults: (datasetId, results) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              results,
            },
          },
        }));
      },

      setShowItemSelection: (datasetId, show) => {
        const datasetState = get().getDatasetState(datasetId);
        set((state) => ({
          datasets: {
            ...state.datasets,
            [datasetId]: {
              ...datasetState,
              showItemSelection: show,
            },
          },
        }));
      },

      selectItem: (datasetId, itemId, checked) => {
        set((state) => {
          const datasetState = get().getDatasetState(datasetId);
          if (!datasetState) return state;

          const updated = new Set(datasetState.selectedItems);
          if (checked) {
            updated.add(itemId);
          } else {
            updated.delete(itemId);
          }

          return {
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...datasetState,
                selectedItems: updated,
              },
            },
          };
        });
      },

      handleSelectAllItems: (datasetId, itemIds) => {
        set((state) => {
          const datasetState = get().getDatasetState(datasetId);
          if (!datasetState) return state;

          return {
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...datasetState,
                selectedItems: new Set(itemIds),
              },
            },
          };
        });
      },

      handleSelectNoItems: (datasetId) => {
        set((state) => {
          const datasetState = get().getDatasetState(datasetId);
          if (!datasetState) return state;

          return {
            datasets: {
              ...state.datasets,
              [datasetId]: {
                ...datasetState,
                selectedItems: new Set(),
              },
            },
          };
        });
      },
    }),
    persistOptions,
  ),
);

// Hook that combines the store with the mcpToolMap from useToolMap
export function useEvaluationToolSelection(datasetId: string) {
  const { mcpToolMap } = useToolMap();

  const toggleMcpExpanded = useEvaluationStore(
    (state) => state.toggleMcpExpanded,
  );
  const toggleTool = useEvaluationStore((state) => state.toggleTool);
  const toggleAllMcpTools = useEvaluationStore(
    (state) => state.toggleAllMcpTools,
  );
  const isToolSelected = useEvaluationStore((state) => state.isToolSelected);

  // Subscribe to the full dataset state to ensure reactivity
  const datasetState = useEvaluationStore((state) => state.datasets[datasetId]);

  const enabledTools = datasetState?.enabledTools;

  const enabledToolCount = useMemo(() => {
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

  const enabledToolCountByMcp = useMemo(() => {
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

  // Check if all tools for an MCP are selected
  const areAllToolsSelected = (mcpId: string, tools: Tool[]) => {
    const currentToolsForMcp = enabledTools[mcpId] || [];
    const allToolIds = tools.map((tool) => tool.name);

    return allToolIds.every((id) => currentToolsForMcp.includes(id));
  };

  return {
    mcpToolMap,
    enabledToolCount,
    expandedSections: datasetState?.expandedMcps,
    enabledToolCountByMcp,
    enabledTools,
    toggleSection: (mcpId: string) => toggleMcpExpanded(datasetId, mcpId),
    handleToggleTool: (mcpId: string, toolName: string) =>
      toggleTool(datasetId, mcpId, toolName),
    handleToggleAllTools: (mcpId: string) =>
      toggleAllMcpTools(datasetId, mcpId, mcpToolMap),
    areAllToolsSelected,
    isToolSelected: (mcpId: string, toolName: string) =>
      isToolSelected(datasetId, mcpId, toolName),
  };
}

// Hook for evaluation state management
export function useEvaluationState(datasetId: string) {
  const initializeDataset = useEvaluationStore(
    (state) => state.initializeDataset,
  );

  const setAgentModelConfig = useEvaluationStore(
    (state) => state.setAgentModelConfig,
  );
  const setAssertionModelConfig = useEvaluationStore(
    (state) => state.setAssertionModelConfig,
  );
  const setSelectedItems = useEvaluationStore(
    (state) => state.setSelectedItems,
  );

  const setIsRunning = useEvaluationStore((state) => state.setIsRunning);
  const setProgress = useEvaluationStore((state) => state.setProgress);
  const setResults = useEvaluationStore((state) => state.setResults);
  const setShowItemSelection = useEvaluationStore(
    (state) => state.setShowItemSelection,
  );
  const selectItem = useEvaluationStore((state) => state.selectItem);
  // Subscribe to the full dataset state to ensure reactivity
  const datasetState = useEvaluationStore((state) => state.datasets[datasetId]);

  const isReady = !!datasetState;

  return {
    // Model config
    isReady,
    agentModelConfig: datasetState?.agentModelConfig,
    assertionModelConfig: datasetState?.assertionModelConfig,
    setAgentModelConfig: (config: IModelConfiguration) =>
      setAgentModelConfig(datasetId, config),
    setAssertionModelConfig: (config: IModelConfiguration) =>
      setAssertionModelConfig(datasetId, config),

    // Selected items
    selectedItems: datasetState?.selectedItems,
    setSelectedItems: (items: Set<string>) =>
      setSelectedItems(datasetId, items),
    // Running state
    isRunning: datasetState?.isRunning,
    setIsRunning: (isRunning: boolean) => setIsRunning(datasetId, isRunning),

    // Progress
    progress: datasetState?.progress,
    setProgress: (progress: EvaluationProgressType | null) =>
      setProgress(datasetId, progress),

    // Results
    results: datasetState?.results,
    setResults: (results: EvaluationSummary | null) =>
      setResults(datasetId, results),

    // Item selection visibility
    showItemSelection: datasetState?.showItemSelection,
    setShowItemSelection: (show: boolean) =>
      setShowItemSelection(datasetId, show),

    // Item selection actions
    selectItem: (itemId: string, checked: boolean) =>
      selectItem(datasetId, itemId, checked),

    initializeDataset: (itemIds?: string[]) =>
      initializeDataset(datasetId, itemIds),
  };
}
