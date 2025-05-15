import React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarGroupLabel,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenu
  } from "@/components/ui/sidebar"
import { Box, Plug, SquareTerminal, Upload } from "lucide-react";
   
  export function AppSidebar() {
    return (
      <Sidebar className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]">
        <SidebarHeader>
        <SidebarMenu>
        <SidebarMenuItem>
        <SidebarMenuButton className="w-fit px-1.5">
          <Box />
        <span className="truncate font-semibold">Local Workspace</span>
          </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        </SidebarHeader>
        <SidebarContent>
        <SidebarGroup>
        <SidebarGroupLabel>Collections</SidebarGroupLabel>
        <SidebarMenu>
        <SidebarMenuItem>
        <SidebarMenuButton>
              <Upload /> Import a collection
            </SidebarMenuButton>
        </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
    <SidebarGroup>
        <SidebarGroupLabel>MCPs</SidebarGroupLabel>
        <SidebarMenu>
        <SidebarMenuItem>
        <SidebarMenuButton>
              <Plug /> Connect your first MCP
            </SidebarMenuButton>
        </SidebarMenuItem>
        </SidebarMenu>
    </SidebarGroup>
    <SidebarGroup>
        <SidebarMenu>
    <SidebarMenuButton>
                                <SquareTerminal className="h-4 w-4" /> Playground
              </SidebarMenuButton>
        </SidebarMenu>
        </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    )
  }