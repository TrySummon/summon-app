import React from "react";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { useToolSidebar } from "./useToolSidebar";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import ToolSidebarHeader from "@/components/tool-sidebar/SidebarHeader";
import McpSection from "@/components/tool-sidebar/McpSection";

export default function ToolSidebar() {
  const {
    mcps,
    toolCount,
    expandedSections,
    selectedToolCounts,
    modifiedToolMap,
    toggleSection,
    handleToggleTool,
    handleToggleAllTools,
    areAllToolsSelected,
    isToolSelected,
    getModifiedName,
    getModifiedTool,
    modifyTool,
    revertTool,
    mcpToolMap,
  } = useToolSidebar();

  if (!mcpToolMap || Object.keys(mcpToolMap).length === 0) {
    return null;
  }

  return (
    <Sidebar
      side="right"
      className="top-[var(--tab-header-height)] !h-[calc(100svh-var(--tab-header-height))]"
    >
      <ToolSidebarHeader toolCount={toolCount} />
      <SidebarContent className="gap-0 overflow-x-hidden overflow-y-auto">
        {[...mcps]
          .sort(([, a], [, b]) => {
            const nameA = (a.name as string).toLowerCase();
            const nameB = (b.name as string).toLowerCase();
            return nameA.localeCompare(nameB);
          })
          .map(([mcpId, mcpData]) => {
            const name = mcpData.name as string;
            const tools = mcpData.tools as Tool[];
            return (
              <McpSection
                key={mcpId}
                mcpId={mcpId}
                name={name}
                tools={tools}
                modifiedToolMap={modifiedToolMap}
                isExpanded={expandedSections[mcpId]}
                selectedToolCount={selectedToolCounts[mcpId]}
                areAllToolsSelected={areAllToolsSelected(mcpId, tools)}
                onToggleSection={() => toggleSection(mcpId)}
                onToggleAllTools={() => handleToggleAllTools(mcpId, tools)}
                onToggleTool={(toolId) => handleToggleTool(mcpId, toolId)}
                isToolSelected={(toolId) => isToolSelected(mcpId, toolId)}
                getModifiedName={getModifiedName}
                getModifiedTool={getModifiedTool}
                onToolModify={modifyTool}
                onToolRevert={revertTool}
              />
            );
          })}
      </SidebarContent>
      <SidebarRail direction="left" />
    </Sidebar>
  );
}
