import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { GlobalSearch } from "@/components/GlobalSearch";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarProvider
        className="flex h-svh flex-col"
        open
        defaultOpen
        defaultWidth="14rem"
        mobileBreakpoint={1}
      >
        <DragWindowRegion />
        <div className="flex flex-grow overflow-hidden">
          <AppSidebar />
          <SidebarInset className="min-h-full overflow-hidden">
            <Toaster position="bottom-center" richColors />
            <main className="flex h-full flex-col overflow-hidden">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <GlobalSearch />
    </>
  );
}
