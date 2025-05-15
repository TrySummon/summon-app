import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import NavigationMenu from "@/components/template/NavigationMenu";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
 
export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;  
}) {
  return (
      <>

      <SidebarProvider className="flex flex-col">
      <DragWindowRegion />
      <div className="flex flex-1">

      <AppSidebar />
      <SidebarInset>

      <main className="flex-1">{children}</main>
      </SidebarInset>
      </div>

    </SidebarProvider>
      <NavigationMenu />
      </>
  );
}
