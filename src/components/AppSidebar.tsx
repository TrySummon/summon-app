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
import { Box, Plug, SquareTerminal } from "lucide-react";
import { ApiNav } from "@/components/api-nav";
import { McpNav } from "@/components/mcp-nav";
import { Link, useLocation } from "@tanstack/react-router";
   
  export function AppSidebar() {
  const location = useLocation();

  return (
    <>
    <Sidebar className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/">
            <SidebarMenuButton className="w-fit px-1.5">
              <Box />
              <span className="truncate font-semibold font-mono">Local Workspace</span>
            </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ApiNav />
          <McpNav />
          <SidebarGroup>
            <SidebarGroupLabel>External MCPs</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-xs">
                <Plug className="!size-3" /> Connect MCP
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link to="/playground">
                <SidebarMenuButton isActive={location.pathname === "/playground"}>
                  <SquareTerminal className="h-4 w-4" /> Playground
                </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      </>
    )
  }