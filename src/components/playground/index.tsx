import React, { useEffect } from 'react';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
} from "@/components/ui/breadcrumb";
import { usePlaygroundStore } from './store';
import PlaygroundTab from './Tab';
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

  // Save origToolMap to the store when it changes and enable all tools for tabs with undefined enabledTools
  useEffect(() => {
    // First, update the store with the new origToolMap
    updateOrigToolMap(origToolMap);
    
    // If we have tools available, check each tab
    if (Object.keys(origToolMap).length > 0) {
      // For each tab, check if enabledTools is undefined and enable all tools if so
      Object.entries(tabs).forEach(([tabId, tab]) => {
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
            }),
            true,
            'Enabled all available tools'
          );
          
          // Restore the original current tab
          usePlaygroundStore.getState().setCurrentTab(currentTabId);
        }
      });
    }
  }, [origToolMap, updateOrigToolMap, tabs]);

  return (
    <div className='flex flex-col h-full'>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <BreadcrumbPage>
                Playground
              </BreadcrumbPage>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className='flex flex-col overflow-y-auto py-4 flex-1'>
        <PlaygroundTab tabId={currentTabId} />
      </div>
    </div>
  )
}