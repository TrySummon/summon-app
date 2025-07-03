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

// Define the state that will be persisted to storage
type PlaygroundStorePersist = {
  tabs: Record<string, PlaygroundTab>;
  currentTabId: string;
  autoExecuteTools: boolean;
};

// Configure persist options
const persistOptions: PersistOptions<PlaygroundStore, PlaygroundStorePersist> =
  {
    name: "playground-store",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      tabs: state.tabs,
      currentTabId: state.currentTabId,
      autoExecuteTools: state.autoExecuteTools,
    }),
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

            // Limit history size
            if (newHistory.length > 100) {
              newHistory = newHistory.slice(-100);
              newHistoryIndex = Math.min(newHistoryIndex, 99);
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
