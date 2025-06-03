import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SidebarProvider className="flex h-svh flex-col">
        <DragWindowRegion />
        <div className="flex flex-grow overflow-hidden">
          <AppSidebar />
          <SidebarInset className="overflow-hidden">
            <Toaster richColors />
            <main className="flex h-full flex-col overflow-hidden">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
