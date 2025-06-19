import React from "react";
import MessageComposer from "../MessageComposer";
import CutModeActionBar from "./CutModeActionBar";
import TabHeader from "./Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import TabBody from "./Body";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import ToolSidebar from "./ToolSidebar";

export default function PlaygroundTab() {
  const cutMode = usePlaygroundStore(
    (state) => state.getCurrentState().cutMode,
  );

  return (
    <SidebarProvider className="min-h-full" mobileBreakpoint={1200}>
      <SidebarInset className="flex flex-1 flex-col gap-4 overflow-y-auto py-2">
        <TabHeader />
        <TabBody />
        {cutMode ? <CutModeActionBar /> : <MessageComposer />}
      </SidebarInset>
      <ToolSidebar />
    </SidebarProvider>
  );
}
