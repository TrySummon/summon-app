import React, { useEffect } from 'react';
import { usePlaygroundStore } from './store';
import PlaygroundTab from './Tab';
import TabNavigation from './TabNavigation';
import useToolMap from '@/hooks/useToolMap';

export default function Playground() {
  const { aiToolMap, origToolMap } = useToolMap();
  const {
    createTab,
    getCurrentTab,
    tabs,
    currentTabId,
    updateAiToolMap,
    updateOrigToolMap
  } = usePlaygroundStore();

  // Create a default tab if no tabs exist
  useEffect(() => {
    const currentTab = getCurrentTab();
    if (!currentTab && Object.keys(tabs).length === 0) {
      createTab(undefined, 'Default Tab');
    }
  }, [getCurrentTab, createTab, tabs]);
  
  // Save aiToolMap to the store when it changes
  useEffect(() => {
      updateAiToolMap(aiToolMap);
  }, [aiToolMap, updateAiToolMap]);

  // Save origToolMap to the store when it changes, enable all tools for tabs with undefined enabledTools,
  // and remove tools that are no longer available
  useEffect(() => {
    // First, update the store with the new origToolMap
    updateOrigToolMap(origToolMap);
    
    // If we have tools available, check each tab
    if (Object.keys(origToolMap).length > 0) {
      // For each tab, process its enabledTools
      Object.entries(tabs).forEach(([tabId, tab]) => {
        // Case 1: enabledTools is undefined - enable all tools
        if (tab.state.enabledTools === undefined) {
          // Create a map of all available tools
          const allTools: Record<string, string[]> = {};
          
          // For each MCP, add all its tools to the enabledTools object
          Object.entries(origToolMap).forEach(([mcpId, { tools }]) => {
            allTools[mcpId] = tools.map(tool => tool.name);
          });
          
          // Update the tab's state with all tools enabled
          // We need to temporarily set this tab as current to update its state
          const currentTabId = usePlaygroundStore.getState().currentTabId;
          
          // Set the tab we want to update as current
          usePlaygroundStore.getState().setCurrentTab(tabId);
          
          // Update the state
          usePlaygroundStore.getState().updateCurrentState(
            state => ({
              ...state,
              enabledTools: allTools
            })
          );
          
          // Restore the original current tab
          usePlaygroundStore.getState().setCurrentTab(currentTabId);
        } 
        // Case 2: enabledTools is defined - check for tools that are no longer available
        else if (tab.state.enabledTools) {
          let needsUpdate = false;
          const updatedEnabledTools: Record<string, string[]> = {};
          
          // For each MCP in the tab's enabledTools
          Object.entries(tab.state.enabledTools).forEach(([mcpId, enabledToolIds]) => {
            // Check if this MCP still exists in origToolMap
            if (origToolMap[mcpId]) {
              // Get the available tool IDs for this MCP
              const availableToolIds = origToolMap[mcpId].tools.map(tool => tool.name);
              
              // Filter out tools that are no longer available
              const validToolIds = enabledToolIds.filter(toolId => 
                availableToolIds.includes(toolId)
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
          });
          
          // If we need to update the tab's enabledTools
          if (needsUpdate) {
            // We need to temporarily set this tab as current to update its state
            const currentTabId = usePlaygroundStore.getState().currentTabId;
            
            // Set the tab we want to update as current
            usePlaygroundStore.getState().setCurrentTab(tabId);
            
            // Update the state
            usePlaygroundStore.getState().updateCurrentState(
              state => ({
                ...state,
                enabledTools: updatedEnabledTools
              })
            );
            
            // Restore the original current tab
            usePlaygroundStore.getState().setCurrentTab(currentTabId);
          }
        }
      });
    }
  }, [origToolMap, updateOrigToolMap, tabs]);

  return (
    <div className='flex flex-col h-full'>
      <TabNavigation />

      <div className='flex flex-col overflow-y-auto py-4 flex-1'>
        <PlaygroundTab tabId={currentTabId} />
      </div>
    </div>
  )
}