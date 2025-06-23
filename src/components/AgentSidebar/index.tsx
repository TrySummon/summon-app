import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@ai-sdk/react";

export function AgentSidebar() {
  const { token, isAuthenticated } = useAuth();
  const {
    messages,
    append,
    isLoading: isChatLoading,
  } = useChat({
    api: `${process.env.VITE_PUBLIC_SUMMON_HOST}/api/agent`,
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  });
  return (
    <>
      <Sidebar
        side="right"
        className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]"
      >
        <SidebarHeader></SidebarHeader>
        <SidebarContent></SidebarContent>
        <SidebarFooter></SidebarFooter>
        <SidebarRail direction="left" />
      </Sidebar>
    </>
  );
}
