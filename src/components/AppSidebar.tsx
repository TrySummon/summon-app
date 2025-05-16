import React, { useState } from "react";
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
import { ImportApiDialog } from "@/components/ImportApiDialog";
   
  export function AppSidebar() {

    return (
      <>
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
            <SidebarGroupLabel>APIs</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
              <ImportApiDialog>
                <SidebarMenuButton>
                  <Upload /> OpenAPI spec
                </SidebarMenuButton>
                </ImportApiDialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>MCPs</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Plug /> Connect MCP
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <SquareTerminal className="h-4 w-4" /> Playground
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      </>
    )
  }