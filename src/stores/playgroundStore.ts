import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { UIMessage } from "ai";
import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
import { runPlaygroundAgent } from "@/lib/agent";
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { LLMSettings } from "./types";

export type ToolMap = Record<string, { name: string; tools: McpTool[] }>;

export interface IPlaygroundTabState {
  id: string;
  credentialId?: string;
  model?: string;
  settings: LLMSettings;
  systemPrompt?: string;
  messages: UIMessage[];
  enabledTools: Record<string, string[]>;
  running: boolean;
  maxSteps: number;
  shouldScrollToDock?: boolean;
  abortController?: AbortController;
  // Token usage information
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  // Latency in milliseconds
  latency?: number;
  selectedDatasetId?: string;
  cutMode?: boolean;
  cutPosition?: number;
  // Track if tool selection is pristine (hasn't been modified yet)
  toolSelectionPristine?: boolean;
}

interface HistoryEntry {
  state: IPlaygroundTabState;
  description: string;
}

interface PlaygroundTab {
  id: string;
  name: string;
  state: IPlaygroundTabState;
  history: HistoryEntry[];
  historyIndex: number;
}

// Helper function to estimate JSON size in bytes
function getJSONSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

// Helper function to strip large tool results from messages for persistence
function stripLargeToolResults(messages: UIMessage[]): UIMessage[] {
  const MAX_TOOL_RESULT_SIZE = 50 * 1024; // 50KB limit per tool result

  return messages.map((message) => {
    if (!message.parts) return message;

    const strippedParts = message.parts.map((part) => {
      if (
        part.type === "tool-invocation" &&
        part.toolInvocation.state === "result" &&
        "result" in part.toolInvocation
      ) {
        const resultSize = getJSONSize(part.toolInvocation.result);

        // If result is too large, replace with a summary
        if (resultSize > MAX_TOOL_RESULT_SIZE) {
          return {
            ...part,
            toolInvocation: {
              ...part.toolInvocation,
              result: {
                _stripped: true,
                _originalSize: resultSize,
                _summary: `Large result (${Math.round(resultSize / 1024)}KB) stripped to save storage`,
                success:
                  typeof part.toolInvocation.result === "object" &&
                  part.toolInvocation.result !== null &&
                  "success" in part.toolInvocation.result
                    ? part.toolInvocation.result.success
                    : true,
              },
            },
          };
        }
      }
      return part;
    });

    return {
      ...message,
      parts: strippedParts,
    };
  });
}

// Helper function to prepare tab state for persistence
function prepareStateForPersistence(
  state: IPlaygroundTabState,
): IPlaygroundTabState {
  return {
    ...state,
    messages: stripLargeToolResults(state.messages),
    // Don't persist runtime-only properties
    running: false,
    shouldScrollToDock: false,
    abortController: undefined,
  };
}

export interface PlaygroundStore {
  // All tabs
  tabs: Record<string, PlaygroundTab>;
  // All available tools in mcp-sdk format
  mcpToolMap: ToolMap;
  // Current active tab ID
  currentTabId: string;
  // Tool sidebar visibility
  showToolSidebar: boolean;
  // Global auto-execute tools setting
  autoExecuteTools: boolean;
  // Global composer state (cross-tab)
  composer: UIMessage;

  // Getters
  getCurrentTab: () => PlaygroundTab | undefined;
  getCurrentState: () => IPlaygroundTabState;

  // Tab management
  getTabs: () => Record<string, PlaygroundTab>;
  updateTab: (tabId: string, updatedTab: PlaygroundTab) => void;
  createTab: (
    initialState?: Partial<IPlaygroundTabState>,
    name?: string,
  ) => string; // returns new tab ID
  duplicateTab: (tabId: string) => string; // returns new tab ID
  renameTab: (tabId: string, name: string) => void;
  closeTab: (tabId: string) => void;
  setCurrentTab: (tabId: string) => void;

  // State management
  updateCurrentState: (
    updater: (state: IPlaygroundTabState) => IPlaygroundTabState,
    addToHistory?: boolean,
    actionDescription?: string,
  ) => void;
  addMessage: (message: UIMessage) => void;
  updateMessage: (messageIndex: number, message: UIMessage) => void;
  updateMessageWithLatency: (
    messageIndex: number,
    message: UIMessage,
    latency: number,
  ) => void;
  deleteMessage: (messageIndex: number) => void;
  rerunFromMessage: (messageIndex: number) => void;
  clearCurrentTab: () => void;

  // Agent control
  stopAgent: () => void;

  // Specific state updates
  updateModel: (model: string) => void;
  updateProviderCredential: (credentialId: string | undefined) => void;
  updateSettings: (settings: Partial<IPlaygroundTabState["settings"]>) => void;
  updateSystemPrompt: (systemPrompt: string) => void;
  updateEnabledTools: (toolProvider: string, toolIds: string[]) => void;
  updateSelectedDatasetId: (datasetId: string | undefined) => void;
  updateMcpToolMap: (mcpToolMap: ToolMap) => void;
  updateShouldScrollToDock: (shouldScrollToDock: boolean) => void;
  setShowToolSidebar: (show: boolean) => void;
  setToolSelectionPristine: (pristine: boolean) => void;
  addToolResult: (
    toolCallId: string,
    result: { success: boolean; data?: unknown; message?: string },
  ) => void;

  // Global auto-execute tools
  getAutoExecuteTools: () => boolean;
  setAutoExecuteTools: (autoExecuteTools: boolean) => void;

  // Global composer management
  getComposer: () => UIMessage;
  setComposer: (composer: UIMessage) => void;
  resetComposer: () => void;

  // History management
  undo: () => string | null;
  redo: () => string | null;
}

const createDefaultState = (): IPlaygroundTabState => ({
  id: uuidv4(),
  credentialId: undefined,
  model: undefined,
  settings: {
    temperature: 0,
    maxTokens: 4096,
  },
  messages: [],
  enabledTools: {},
  running: false,
  maxSteps: 10,
  shouldScrollToDock: false,
  toolSelectionPristine: true,
});

const createDefaultComposer = (): UIMessage => ({
  id: uuidv4(),
  role: "user",
  content: "",
  parts: [{ type: "text", text: "" }],
});

// Define the state that will be persisted to storage
type PlaygroundStorePersist = {
  tabs: Record<string, Omit<PlaygroundTab, "history" | "historyIndex">>;
  currentTabId: string;
  autoExecuteTools: boolean;
  composer: UIMessage;
};

// Configure persist options
const persistOptions: PersistOptions<PlaygroundStore, PlaygroundStorePersist> =
  {
    name: "playground-store",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => {
      const MAX_STORAGE_SIZE = 8 * 1024 * 1024; // 8MB limit

      // Create a clean version of tabs without history and with size limits
      const cleanTabs: Record<
        string,
        Omit<PlaygroundTab, "history" | "historyIndex">
      > = {};

      for (const [tabId, tab] of Object.entries(state.tabs)) {
        const cleanTab = {
          id: tab.id,
          name: tab.name,
          state: prepareStateForPersistence(tab.state),
        };

        cleanTabs[tabId] = cleanTab;
      }

      const persistData = {
        tabs: cleanTabs,
        currentTabId: state.currentTabId,
        autoExecuteTools: state.autoExecuteTools,
        composer: state.composer,
      };

      // Check if the data size is within limits
      const dataSize = getJSONSize(persistData);
      if (dataSize > MAX_STORAGE_SIZE) {
        console.warn(
          `Playground store data size (${Math.round(dataSize / 1024)}KB) exceeds limit. Reducing data...`,
        );

        // Further reduce by keeping only the current tab and 2 recent tabs
        const tabEntries = Object.entries(cleanTabs);
        const currentTabEntry = tabEntries.find(
          ([id]) => id === state.currentTabId,
        );
        const otherTabs = tabEntries
          .filter(([id]) => id !== state.currentTabId)
          .slice(0, 2);

        const reducedTabs: Record<
          string,
          Omit<PlaygroundTab, "history" | "historyIndex">
        > = {};

        if (currentTabEntry) {
          reducedTabs[currentTabEntry[0]] = currentTabEntry[1];
        }

        otherTabs.forEach(([id, tab]) => {
          reducedTabs[id] = tab;
        });

        persistData.tabs = reducedTabs;

        const reducedSize = getJSONSize(persistData);
        console.warn(`Reduced to ${Math.round(reducedSize / 1024)}KB`);
      }

      return persistData;
    },
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error("Error rehydrating playground store:", error);
        return;
      }

      if (state) {
        // Restore tabs with empty history
        const restoredTabs: Record<string, PlaygroundTab> = {};

        for (const [tabId, tabData] of Object.entries(state.tabs)) {
          restoredTabs[tabId] = {
            ...tabData,
            history: [
              { state: tabData.state, description: "Restored from storage" },
            ],
            historyIndex: 0,
          };
        }

        state.tabs = restoredTabs;

        // Ensure composer is restored or set to default
        if (!state.composer) {
          state.composer = createDefaultComposer();
        }
      }
    },
  };

// Create the store
export const usePlaygroundStore = create<PlaygroundStore>()(
  persist(
    (set, get) => ({
      tabs: {},
      mcpToolMap: {},
      currentTabId: "",
      showToolSidebar: false,
      autoExecuteTools: true,
      composer: createDefaultComposer(),

      getTabs: () => {
        const { tabs } = get();
        return tabs;
      },

      getCurrentTab: () => {
        const { tabs, currentTabId } = get();
        return tabs[currentTabId];
      },

      getCurrentState: () => {
        const currentTab = get().getCurrentTab();
        if (!currentTab) return createDefaultState();
        return currentTab.state;
      },

      createTab: (initialState, name = "New Tab") => {
        const newState = {
          ...createDefaultState(),
          ...initialState,
        };

        const tabId = uuidv4();
        const newTab: PlaygroundTab = {
          id: tabId,
          name,
          state: newState,
          history: [{ state: newState, description: "Initial state" }],
          historyIndex: 0,
        };

        set((state) => ({
          tabs: {
            ...state.tabs,
            [tabId]: newTab,
          },
          currentTabId: tabId,
        }));

        return tabId;
      },

      updateTab: (tabId: string, updatedTab: PlaygroundTab) => {
        set((state) => ({
          tabs: {
            ...state.tabs,
            [tabId]: updatedTab,
          },
        }));
      },

      duplicateTab: (tabId) => {
        const tabToDuplicate = get().tabs[tabId];
        if (!tabToDuplicate) return tabId; // Return original if not found

        // Create a partial state with the properties we want to duplicate
        const partialState: Partial<IPlaygroundTabState> = {
          systemPrompt: tabToDuplicate.state.systemPrompt,
          messages: [...tabToDuplicate.state.messages],
          settings: { ...tabToDuplicate.state.settings },
          enabledTools: tabToDuplicate.state.enabledTools,
          model: tabToDuplicate.state.model,
          credentialId: tabToDuplicate.state.credentialId,
        };

        // Create a new tab with the duplicated state
        return get().createTab(partialState, `${tabToDuplicate.name} (copy)`);
      },

      renameTab: (tabId, name) => {
        set((state) => {
          const tab = state.tabs[tabId];
          if (!tab) return state;

          return {
            tabs: {
              ...state.tabs,
              [tabId]: {
                ...tab,
                name,
              },
            },
          };
        });
      },

      closeTab: (tabId) => {
        set((state) => {
          const newTabs = { ...state.tabs };
          delete newTabs[tabId];

          // If we're closing the current tab, switch to another tab if available
          let newCurrentTabId = state.currentTabId;
          if (tabId === state.currentTabId) {
            const tabIds = Object.keys(newTabs);
            newCurrentTabId = tabIds.length > 0 ? tabIds[0] : "";
          }

          return {
            tabs: newTabs,
            currentTabId: newCurrentTabId,
          };
        });
      },

      setCurrentTab: (tabId) => {
        if (get().tabs[tabId]) {
          set({ currentTabId: tabId });
        }
      },

      updateCurrentState: (
        updater: (state: IPlaygroundTabState) => IPlaygroundTabState,
        addToHistory?: boolean,
        actionDescription?: string,
      ) => {
        const currentTab = get().getCurrentTab();
        if (!currentTab) return;

        const updatedState = updater(currentTab.state);

        // Always generate a new ID for the state
        updatedState.id = addToHistory ? uuidv4() : currentTab.state.id;

        set((state) => {
          const tab = state.tabs[state.currentTabId];
          if (!tab) return state;

          let newHistory = tab.history;
          let newHistoryIndex = tab.historyIndex;

          if (addToHistory && actionDescription) {
            // Only add to history if explicitly requested and a description is provided
            // Remove any future history entries if we're in the middle of the history
            const historyCut = tab.history.slice(0, tab.historyIndex + 1);

            // Create a new history entry with the current state and description
            newHistory = [
              ...historyCut,
              {
                state: updatedState,
                description: actionDescription,
              },
            ];

            newHistoryIndex = newHistory.length - 1;

            // Limit history size to prevent memory issues
            if (newHistory.length > 50) {
              // Reduced from 100 to 50
              newHistory = newHistory.slice(-50);
              newHistoryIndex = Math.min(newHistoryIndex, 49);
            }
          }

          return {
            tabs: {
              ...state.tabs,
              [state.currentTabId]: {
                ...tab,
                state: updatedState,
                history: newHistory,
                historyIndex: newHistoryIndex,
              },
            },
          };
        });
      },

      addMessage: async (message) => {
        // Add the user message to the state, creating a history entry
        get().updateCurrentState(
          (state) => ({
            ...state,
            messages: [
              ...state.messages,
              { ...message, id: message.id || uuidv4() },
            ],
          }),
          true,
          `Added message: ${message.role}`,
        ); // Pass true for addToHistory with description
      },

      addToolResult: (toolCallId, result) => {
        const messages = get().getCurrentState().messages;
        const messageIndex = messages.findIndex((message) =>
          message.parts.some(
            (part) =>
              part.type === "tool-invocation" &&
              part.toolInvocation.toolCallId === toolCallId,
          ),
        );

        if (messageIndex === -1) return;

        const message = messages[messageIndex];
        const updatedMessage = {
          ...message,
          parts: message.parts.map((part) => {
            if (
              part.type === "tool-invocation" &&
              part.toolInvocation.toolCallId === toolCallId
            ) {
              return {
                ...part,
                toolInvocation: {
                  ...part.toolInvocation,
                  state: "result" as const,
                  result,
                },
              };
            }
            return part;
          }),
        };

        get().updateCurrentState((state) => {
          const newMessages = [...state.messages];
          newMessages[messageIndex] = updatedMessage;
          return { ...state, messages: newMessages };
        });

        // Check if any message still has a pending tool call (state === "partial-call")
        const updatedMessages = get().getCurrentState().messages;
        const hasPendingToolCalls = updatedMessages.some((msg) =>
          msg.parts.some(
            (part) =>
              part.type === "tool-invocation" &&
              part.toolInvocation.state === "partial-call",
          ),
        );

        // If no pending tool calls remain, run the agent
        if (!hasPendingToolCalls) {
          runPlaygroundAgent();
        }
      },

      updateMessage: (messageIndex, message) => {
        // Update a message, typically during streaming, without creating a new history entry
        get().updateCurrentState((state) => {
          const newMessages = [...state.messages];
          newMessages[messageIndex] = {
            ...message,
            id: message.id || newMessages[messageIndex].id,
          };
          return { ...state, messages: newMessages };
        }, false); // Pass false for addToHistory
      },

      updateMessageWithLatency: (messageIndex, message, latency) => {
        // Update a message with latency, typically during streaming, without creating a new history entry
        get().updateCurrentState((state) => {
          const newMessages = [...state.messages];
          newMessages[messageIndex] = {
            ...message,
            id: message.id || newMessages[messageIndex].id,
          };
          return {
            ...state,
            messages: newMessages,
            latency,
          };
        });
      },

      // History management
      undo: () => {
        const currentTab = get().getCurrentTab();
        if (!currentTab || currentTab.historyIndex <= 0) return null;

        const previousHistoryEntry =
          currentTab.history[currentTab.historyIndex - 1];
        const currentHistoryEntry = currentTab.history[currentTab.historyIndex];

        set((state) => {
          const tab = state.tabs[state.currentTabId];
          if (!tab) return state;

          const newHistoryIndex = tab.historyIndex - 1;
          return {
            tabs: {
              ...state.tabs,
              [state.currentTabId]: {
                ...tab,
                state: {
                  ...previousHistoryEntry.state,
                  running: false, // Always ensure running is false when restoring state
                },
                historyIndex: newHistoryIndex,
              },
            },
          };
        });

        return currentHistoryEntry.description;
      },

      redo: () => {
        const currentTab = get().getCurrentTab();
        if (
          !currentTab ||
          currentTab.historyIndex >= currentTab.history.length - 1
        )
          return null;

        const nextHistoryEntry =
          currentTab.history[currentTab.historyIndex + 1];

        set((state) => {
          const tab = state.tabs[state.currentTabId];
          if (!tab) return state;

          const newHistoryIndex = tab.historyIndex + 1;
          return {
            tabs: {
              ...state.tabs,
              [state.currentTabId]: {
                ...tab,
                state: {
                  ...nextHistoryEntry.state,
                  running: false, // Always ensure running is false when restoring state
                },
                historyIndex: newHistoryIndex,
              },
            },
          };
        });

        return nextHistoryEntry.description;
      },

      // Specific state updates - these now update the current state directly instead of forking
      updateModel: (model) => {
        get().updateCurrentState((state) => ({
          ...state,
          model,
        }));
      },

      updateProviderCredential: (credentialId) => {
        get().updateCurrentState(
          (state) => ({
            ...state,
            credentialId,
          }),
          false,
        ); // Don't track provider changes in history
      },

      updateSettings: (settings) => {
        get().updateCurrentState((state) => ({
          ...state,
          settings: {
            ...state.settings,
            ...settings,
          },
        }));
      },

      updateSystemPrompt: (systemPrompt) => {
        get().updateCurrentState((state) => ({
          ...state,
          systemPrompt,
        }));
      },

      updateSelectedDatasetId: (selectedDatasetId) => {
        get().updateCurrentState((state) => ({
          ...state,
          selectedDatasetId,
        }));
      },

      updateEnabledTools: (toolProvider, toolIds) => {
        get().updateCurrentState((state) => ({
          ...state,
          enabledTools: {
            ...state.enabledTools,
            [toolProvider]: toolIds,
          },
          toolSelectionPristine: false,
        }));
      },

      updateMcpToolMap: (mcpToolMap) => {
        set({ mcpToolMap });
      },

      updateShouldScrollToDock: (shouldScrollToDock) => {
        get().updateCurrentState((state) => ({
          ...state,
          shouldScrollToDock,
        }));
      },

      setShowToolSidebar: (show) => {
        set((state) => ({
          ...state,
          showToolSidebar: show,
        }));
      },

      setToolSelectionPristine: (pristine) => {
        get().updateCurrentState((state) => ({
          ...state,
          toolSelectionPristine: pristine,
        }));
      },

      deleteMessage: (messageIndex) => {
        get().updateCurrentState(
          (state) => {
            const newMessages = [...state.messages];
            newMessages.splice(messageIndex, 1);
            return { ...state, messages: newMessages };
          },
          true,
          `Deleted message at position ${messageIndex + 1}`,
        );
      },

      rerunFromMessage: (messageIndex) => {
        const { getCurrentState, updateCurrentState } = get();
        const state = getCurrentState();

        if (messageIndex < 0 || messageIndex >= state.messages.length) return;

        // Keep messages up to the selected index
        const messages = state.messages.slice(0, messageIndex + 1);
        // Update state with truncated messages
        updateCurrentState(
          (state) => ({
            ...state,
            messages,
          }),
          true,
          `Rerun from message ${messageIndex + 1}`,
        );

        // Run the agent with the updated state
        runPlaygroundAgent();
      },

      stopAgent: () => {
        const { getCurrentState, updateCurrentState } = get();
        const state = getCurrentState();
        // Abort the current request
        if (state.abortController) {
          state.abortController.abort();
        } else {
          console.info("No abort controller found in state");
        }

        // Reset the abort controller and running state
        updateCurrentState(
          (state) => ({
            ...state,
            running: false,
            abortController: undefined,
          }),
          false,
        );

        // We don't need to force scroll docking anymore
        get().updateShouldScrollToDock(false);
      },

      clearCurrentTab: () => {
        const currentTab = get().getCurrentTab();
        if (!currentTab) return;

        // Create a fresh state with the same settings but cleared messages
        const freshState = {
          ...currentTab.state,
          id: uuidv4(),
          messages: [],
          tokenUsage: undefined,
          latency: undefined,
        };

        set((state) => {
          const updatedTab = {
            ...state.tabs[state.currentTabId],
            state: freshState,
            // Reset history to just have this clean state
            history: [
              {
                state: freshState,
                description: "Cleared messages and history",
              },
            ],
            historyIndex: 0,
          };

          return {
            tabs: {
              ...state.tabs,
              [state.currentTabId]: updatedTab,
            },
          };
        });
      },

      // Global auto-execute tools
      getAutoExecuteTools: () => {
        const { autoExecuteTools } = get();
        return autoExecuteTools;
      },
      setAutoExecuteTools: (autoExecuteTools) => {
        set((state) => ({
          ...state,
          autoExecuteTools,
        }));
      },

      // Global composer management
      getComposer: () => {
        const { composer } = get();
        return composer;
      },
      setComposer: (composer) => {
        set((state) => ({
          ...state,
          composer,
        }));
      },
      resetComposer: () => {
        set((state) => ({
          ...state,
          composer: createDefaultComposer(),
        }));
      },
    }),
    persistOptions,
  ),
);

// Initialize the store with a default tab if none exists
const initializeStore = () => {
  const store = usePlaygroundStore.getState();
  if (Object.keys(store.tabs).length === 0) {
    store.createTab(undefined, "Default Tab");
  }
};

// Run initialization
initializeStore();
