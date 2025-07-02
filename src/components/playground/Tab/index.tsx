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
    <SidebarProvider
      className="flex min-h-0 flex-1"
      mobileBreakpoint={1200}
      defaultWidth="18rem"
    >
      <SidebarInset className="flex min-h-0 flex-1 flex-col gap-4 py-2">
        <TabHeader />
        <TabBody />
        {cutMode ? <CutModeActionBar /> : <MessageComposer />}
      </SidebarInset>
      <ToolSidebar />
    </SidebarProvider>
  );
}
