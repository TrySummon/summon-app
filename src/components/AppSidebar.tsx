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
import { Box, Plug, SquareTerminal, Database, MessageSquare, Brain } from "lucide-react";
import { ApiNav } from "@/components/api-nav";
import { McpNav } from "@/components/mcp-nav";
import { Link } from "@tanstack/react-router";
   
  export function AppSidebar() {

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
          
          {/* Placeholder sections for future features */}
          <SidebarGroup>
            <SidebarGroupLabel>Lab (coming soon)</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-xs">
                  <Database className="h-4 w-4" />
                  Datasets
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-xs">
                  <MessageSquare className="h-4 w-4" />
                  Prompts
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="text-xs">
                  <Brain className="h-4 w-4" />
                  AI Context
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          
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