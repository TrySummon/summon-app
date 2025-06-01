import React from 'react';
import MessageComposer from '../MessageComposer';
import TabHeader from './Header';
import ToolSidebar from './ToolSidebar';
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import TabBody from './Body';


export default function PlaygroundTab() {
  return (
    <SidebarProvider className='min-h-full' mobileBreakpoint={1200}>
      <SidebarInset className='flex flex-col flex-1 py-2 gap-4 overflow-y-auto'>
        <TabHeader />
        <TabBody />
        <MessageComposer />
    </SidebarInset>
    <ToolSidebar />
    </SidebarProvider>
  )
}