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
  const { aiToolMap } = useToolMap();
  const {
    createTab,
    getCurrentTab,
    tabs,
    currentTabId,
    updateAiToolMap
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