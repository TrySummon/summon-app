import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Tool, UIMessage } from 'ai';
import { IPlaygroundState } from './state';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { runAgent } from './agent';
import { Tool as McpTool } from '@modelcontextprotocol/sdk/types';


interface HistoryEntry {
  state: IPlaygroundState;
  description: string;
}

interface PlaygroundTab {
  id: string;
  name: string;
  state: IPlaygroundState;
  history: HistoryEntry[];
  historyIndex: number;
}

export interface PlaygroundStore {
  // All tabs
  tabs: Record<string, PlaygroundTab>;
  // All available tools in ai-sdk format
  aiToolMap: Record<string, Record<string, Tool>>;
  // All available tools in mcp-sdk format
  origToolMap: Record<string, {name: string, tools: McpTool[]}>;
  // Current active tab ID
  currentTabId: string;
  
  // Getters
  getCurrentTab: () => PlaygroundTab | undefined;
  getCurrentState: () => IPlaygroundState;
  
  // Tab management
  createTab: (initialState?: Partial<IPlaygroundState>, name?: string) => string; // returns new tab ID
  renameTab: (tabId: string, name: string) => void;
  closeTab: (tabId: string) => void;
  setCurrentTab: (tabId: string) => void;
  
  // State management
  updateCurrentState: (updater: (state: IPlaygroundState) => IPlaygroundState, addToHistory?: boolean, actionDescription?: string) => void;
  addMessage: (message: UIMessage) => void;
  updateMessage: (messageIndex: number, message: UIMessage) => void;
  deleteMessage: (messageIndex: number) => void;
  rerunFromMessage: (messageIndex: number) => void;
  
  // Agent control
  stopAgent: () => void;
  
  // Specific state updates
  updateModel: (model: string) => void;
  updateProviderCredential: (credentialId: string | undefined) => void;
  updateSettings: (settings: Partial<IPlaygroundState['settings']>) => void;
  updateSystemPrompt: (systemPrompt: string) => void;
  updateEnabledTools: (toolProvider: string, toolIds: string[]) => void;
  updateAiToolMap: (aiToolMap: Record<string, Record<string, Tool>>) => void;
  updateOrigToolMap: (origToolMap: Record<string, {name: string, tools: McpTool[]}>) => void;
  updateShouldScrollToDock: (shouldScrollToDock: boolean) => void;
  
  // History management
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const createDefaultState = (): IPlaygroundState => ({
  id: uuidv4(),
  credentialId: undefined,
  model: undefined,
  settings: {
    temperature: 0,
    maxTokens: 4096
  },
  messages: [],
  enabledTools: undefined,
  running: false,
  maxSteps: 10,
  shouldScrollToDock: false,
});

// Define the state that will be persisted to storage
type PlaygroundStorePersist = {
  tabs: Record<string, PlaygroundTab>;
  currentTabId: string;
};

// Configure persist options
const persistOptions: PersistOptions<
  PlaygroundStore,
  PlaygroundStorePersist
> = {
  name: 'playground-store',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    tabs: state.tabs,
    currentTabId: state.currentTabId
  }),
};

// Create the store
export const usePlaygroundStore = create<PlaygroundStore>()(
  persist(
    (set, get) => ({
  tabs: {},
  aiToolMap: {},
  origToolMap: {},
  currentTabId: '',

  getCurrentTab: () => {
    const { tabs, currentTabId } = get();
    return tabs[currentTabId];
  },

  getCurrentState: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return createDefaultState();
    return currentTab.state;
  },

  createTab: (initialState, name = 'New Tab') => {
    const newState = {
      ...createDefaultState(),
      ...initialState
    };
    
    const tabId = uuidv4();
    const newTab: PlaygroundTab = {
      id: tabId,
      name,
      state: newState,
      history: [{ state: newState, description: 'Initial state' }],
      historyIndex: 0
    };
    
    set(state => ({
      tabs: {
        ...state.tabs,
        [tabId]: newTab
      },
      currentTabId: tabId
    }));
    
    return tabId;
  },

  renameTab: (tabId, name) => {
    set(state => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            name
          }
        }
      };
    });
  },

  closeTab: (tabId) => {
    set(state => {
      const newTabs = { ...state.tabs };
      delete newTabs[tabId];
      
      // If we're closing the current tab, switch to another tab if available
      let newCurrentTabId = state.currentTabId;
      if (tabId === state.currentTabId) {
        const tabIds = Object.keys(newTabs);
        newCurrentTabId = tabIds.length > 0 ? tabIds[0] : '';
      }
      
      return {
        tabs: newTabs,
        currentTabId: newCurrentTabId
      };
    });
  },

  setCurrentTab: (tabId) => {
    if (get().tabs[tabId]) {
      set({ currentTabId: tabId });
    }
  },

  updateCurrentState: (updater, addToHistory = false, actionDescription?: string) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    const updatedState = updater(currentTab.state);

    // Always generate a new ID for the state
    updatedState.id = addToHistory ? uuidv4() : currentTab.state.id;
        
    set(state => {
      const tab = state.tabs[state.currentTabId];
      if (!tab) return state;
      
      let newHistory = tab.history;
      let newHistoryIndex = tab.historyIndex;
      
      if (addToHistory && actionDescription) {
        // Only add to history if explicitly requested and a description is provided
        // Remove any future history entries if we're in the middle of the history
        const historyCut = tab.history.slice(0, tab.historyIndex + 1);
        
        // Create a new history entry with the current state and description
        newHistory = [...historyCut, { 
          state: updatedState,
          description: actionDescription
        }];
        
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
            historyIndex: newHistoryIndex
          }
        }
      };
    });
  },

  addMessage: async (message) => {
    // Add the user message to the state, creating a history entry
    get().updateCurrentState((state) => ({
      ...state,
      messages: [...state.messages, { ...message, id: message.id || uuidv4() }]
    }), true, `Added message: ${message.role}`); // Pass true for addToHistory with description

    // runAgent(get);
  },

  updateMessage: (messageIndex, message) => {
    // Update a message, typically during streaming, without creating a new history entry
    get().updateCurrentState((state) => {
      const newMessages = [...state.messages];
      newMessages[messageIndex] = { ...message, id: message.id || newMessages[messageIndex].id };
      return { ...state, messages: newMessages };
    }, false); // Pass false for addToHistory
  },
  
  // History management
  undo: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab || currentTab.historyIndex <= 0) return null;
    
    const previousHistoryEntry = currentTab.history[currentTab.historyIndex - 1];
    const currentHistoryEntry = currentTab.history[currentTab.historyIndex];
    
    set(state => {
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
              running: false // Always ensure running is false when restoring state
            },
            historyIndex: newHistoryIndex
          }
        }
      };
    });
    
    return currentHistoryEntry.description;
  },
  
  redo: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab || currentTab.historyIndex >= currentTab.history.length - 1) return null;
    
    const nextHistoryEntry = currentTab.history[currentTab.historyIndex + 1];
    
    set(state => {
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
              running: false // Always ensure running is false when restoring state
            },
            historyIndex: newHistoryIndex
          }
        }
      };
    });
    
    return nextHistoryEntry.description;
  },
  
  canUndo: () => {
    const currentTab = get().getCurrentTab();
    return !!currentTab && currentTab.historyIndex > 0;
  },
  
  canRedo: () => {
    const currentTab = get().getCurrentTab();
    return !!currentTab && currentTab.historyIndex < currentTab.history.length - 1;
  },
  
  // Specific state updates - these now update the current state directly instead of forking
  updateModel: (model) => {
    get().updateCurrentState(state => ({
      ...state,
      model
    }));
  },
  
  updateProviderCredential: (credentialId) => {
    get().updateCurrentState(state => ({
      ...state,
      credentialId
    }), false); // Don't track provider changes in history
  },
  
  updateSettings: (settings) => {
    get().updateCurrentState(state => ({
      ...state,
      settings: {
        ...state.settings,
        ...settings
      }
    }));
  },
  
  updateSystemPrompt: (systemPrompt) => {
    get().updateCurrentState(state => ({
      ...state,
      systemPrompt
    }));
  },
  
  updateEnabledTools: (toolProvider, toolIds) => {
    get().updateCurrentState(state => ({
      ...state,
      enabledTools: {
        ...state.enabledTools,
        [toolProvider]: toolIds
      }
    }));
  },

  updateAiToolMap: (aiToolMap) => {
    set({ aiToolMap });
  },

  updateOrigToolMap: (origToolMap) => {
    set({ origToolMap });
  },
  
  updateShouldScrollToDock: (shouldScrollToDock) => {
    get().updateCurrentState((state) => ({
      ...state,
      shouldScrollToDock
    }), false);
  },

  deleteMessage: (messageIndex) => {
    get().updateCurrentState(state => {
      const deletedMessage = state.messages[messageIndex];
      const newMessages = [...state.messages];
      newMessages.splice(messageIndex, 1);
      return { ...state, messages: newMessages };
    }, true, `Deleted message at position ${messageIndex + 1}`);
  },

  rerunFromMessage: (messageIndex) => {
    const { getCurrentState, updateCurrentState } = get();
    const state = getCurrentState();
    
    if (messageIndex < 0 || messageIndex >= state.messages.length) return;
    
    // Keep messages up to the selected index
    const messages = state.messages.slice(0, messageIndex + 1);
    // Update state with truncated messages
    updateCurrentState(state => ({
      ...state,
      messages
    }), true, `Rerun from message ${messageIndex + 1}`);
    
    // Run the agent with the updated state
    runAgent(get());
  },

  stopAgent: () => {
    const { getCurrentState, updateCurrentState } = get();
    const state = getCurrentState();
      // Abort the current request
      state.abortController?.abort?.();
      
      // Reset the abort controller and running state
      updateCurrentState(state => ({
        ...state,
        running: false,
        abortController: undefined
      }), false);
      
      // We don't need to force scroll docking anymore
      get().updateShouldScrollToDock(false);
  },
    }),
    persistOptions
  )
);

// Initialize the store with a default tab if none exists
const initializeStore = () => {
  const store = usePlaygroundStore.getState();
  if (Object.keys(store.tabs).length === 0) {
    store.createTab(undefined, 'Default Tab');
  }
};

// Run initialization
initializeStore();
