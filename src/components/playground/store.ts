import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Tool, UIMessage } from 'ai';
import { IPlaygroundState } from './state';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { runAgent } from './agent';


interface PlaygroundTab {
  id: string;
  name: string;
  state: IPlaygroundState;
  history: IPlaygroundState[];
  historyIndex: number;
}

export interface PlaygroundStore {
  // All tabs
  tabs: Record<string, PlaygroundTab>;
  // All available tools
  aiToolMap: Record<string, Record<string, Tool>>;
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
  updateCurrentState: (updater: (state: IPlaygroundState) => IPlaygroundState) => void;
  addMessage: (message: UIMessage) => void;
  updateMessage: (messageIndex: number, message: UIMessage) => void;
  deleteMessage: (messageIndex: number) => void;
  
  // Specific state updates
  updateModel: (model: string) => void;
  updateProvider: (provider: IPlaygroundState['provider']) => void;
  updateSettings: (settings: Partial<IPlaygroundState['settings']>) => void;
  updateSystemPrompt: (systemPrompt: string) => void;
  updateEnabledTools: (toolProvider: string, toolIds: string[]) => void;
  updateExistingMessage: (messageIndex: number, message: UIMessage) => void;
  updateAiToolMap: (aiToolMap: Record<string, Record<string, Tool>>) => void;
  
  // History management
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const createDefaultState = (): IPlaygroundState => ({
  id: uuidv4(),
  provider: 'openai',
  model: 'gpt-4o',
  settings: {
    temperature: 0,
    maxTokens: 4096
  },
  messages: [],
  enabledTools: {},
  running: false,
  maxSteps: 10,
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
      history: [newState],
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

  updateCurrentState: (updater) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    const updatedState = updater(currentTab.state);
    updatedState.id = uuidv4(); // Generate new ID for the state
    
    set(state => {
      const tab = state.tabs[state.currentTabId];
      if (!tab) return state;
      
      // Create new history array, removing any future states if we're in the middle of history
      const newHistory = [...tab.history.slice(0, tab.historyIndex + 1), updatedState];
      
      return {
        tabs: {
          ...state.tabs,
          [state.currentTabId]: {
            ...tab,
            state: updatedState,
            history: newHistory,
            historyIndex: newHistory.length - 1
          }
        }
      };
    });
  },

  addMessage: async (message) => {
    // Add the user message to the state
    get().updateCurrentState((state) => ({
      ...state,
      messages: [...state.messages, { ...message, id: message.id || uuidv4() }]
    }));

    runAgent(get);
  },

  updateMessage: (messageIndex, message) => {
    get().updateCurrentState((state) => {
      const newMessages = [...state.messages];
      newMessages[messageIndex] = { ...message, id: message.id || newMessages[messageIndex].id };
      return { ...state, messages: newMessages };
    });
  },
  
  // History management
  undo: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab || currentTab.historyIndex <= 0) return;
    
    set(state => {
      const tab = state.tabs[state.currentTabId];
      if (!tab) return state;
      
      const newHistoryIndex = tab.historyIndex - 1;
      return {
        tabs: {
          ...state.tabs,
          [state.currentTabId]: {
            ...tab,
            state: tab.history[newHistoryIndex],
            historyIndex: newHistoryIndex
          }
        }
      };
    });
  },
  
  redo: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab || currentTab.historyIndex >= currentTab.history.length - 1) return;
    
    set(state => {
      const tab = state.tabs[state.currentTabId];
      if (!tab) return state;
      
      const newHistoryIndex = tab.historyIndex + 1;
      return {
        tabs: {
          ...state.tabs,
          [state.currentTabId]: {
            ...tab,
            state: tab.history[newHistoryIndex],
            historyIndex: newHistoryIndex
          }
        }
      };
    });
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
  
  updateProvider: (provider) => {
    get().updateCurrentState(state => ({
      ...state,
      provider
    }));
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
  
  updateExistingMessage: (messageIndex, message) => {
    get().updateCurrentState(state => {
      const newMessages = [...state.messages];
      newMessages[messageIndex] = { ...message, id: message.id || newMessages[messageIndex].id };
      return { ...state, messages: newMessages };
    });
  },

  updateAiToolMap: (aiToolMap) => {
    set({ aiToolMap });
  },

  deleteMessage: (messageIndex) => {
    get().updateCurrentState(state => {
      const newMessages = [...state.messages];
      newMessages.splice(messageIndex, 1);
      return { ...state, messages: newMessages };
    });
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
