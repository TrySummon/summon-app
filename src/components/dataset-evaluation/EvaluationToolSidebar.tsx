import React, { useMemo } from "react";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import ToolSidebarHeader from "@/components/tool-sidebar/SidebarHeader";
import McpSection from "@/components/tool-sidebar/McpSection";
import { useEvaluationToolSelection } from "@/stores/evaluationStore";

export default function EvaluationToolSidebar({
  datasetId,
}: {
  datasetId: string;
}) {
  const {
    enabledToolCount,
    expandedSections,
    enabledToolCountByMcp,
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
    getMcpSelectionState,
  } = useEvaluationToolSelection(datasetId);

  const mcps = useMemo(() => Object.entries(mcpToolMap), [mcpToolMap]);

  if (!mcpToolMap || Object.keys(mcpToolMap).length === 0) {
    return null;
  }

  return (
    <Sidebar
      side="right"
      className="top-[var(--tab-header-height)] !h-[calc(100svh-var(--tab-header-height))]"
    >
      <ToolSidebarHeader toolCount={enabledToolCount} />
      <SidebarContent className="gap-0 overflow-x-hidden overflow-y-auto">
        {mcps
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
                selectedToolCount={enabledToolCountByMcp[mcpId]}
                getMcpSelectionState={(mcpId, tools) =>
                  getMcpSelectionState(mcpId)
                }
                onToggleSection={() => toggleSection(mcpId)}
                onToggleAllTools={() => handleToggleAllTools(mcpId)}
                onToggleTool={handleToggleTool}
                isToolSelected={isToolSelected}
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
