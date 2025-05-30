import React, { useMemo } from 'react';
import { usePlaygroundStore } from '../store';
import Messages from '../Messages';
import MessageComposer from '../MessageComposer';
import TabHeader from './Header';
import ToolSidebar from './ToolSidebar';

interface PlaygroundTabProps {
  tabId: string;
}

export default function PlaygroundTab({ tabId }: PlaygroundTabProps) {
  const {
    tabs,
  } = usePlaygroundStore();

  const tab = useMemo(() => tabs[tabId], [tabs, tabId]);

  if (!tab) {
    return null;
  }


  return (
    <div className='flex h-full'>
      <div className='flex flex-col flex-1 py-2 gap-4 overflow-y-auto'>
        <TabHeader />
        <Messages />
        <MessageComposer running={tab.state.running} />
      </div>
      <ToolSidebar />
    </div>
  )
}