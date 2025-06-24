import React from "react";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCapabilitiesSidebar } from "./useCapabilitiesSidebar";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import ToolSidebarHeader from "@/components/tool-sidebar/SidebarHeader";
import McpSection from "@/components/tool-sidebar/McpSection";
import { Prompt, Resource } from "@/types/mcp";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";
import PromptItem from "@/components/tool-sidebar/PromptItem";
import ResourceItem from "@/components/tool-sidebar/ResourceItem";

// Create prompt section following the same design pattern as McpSection
const McpPromptSection: React.FC<{
  mcpId: string;
  name: string;
  prompts: Prompt[];
  isExpanded: boolean;
  selectedPromptCount: number;
  areAllPromptsSelected: boolean;
  onToggleSection: () => void;
  onToggleAllPrompts: () => void;
  onTogglePrompt: (promptId: string) => void;
  isPromptSelected: (promptId: string) => boolean;
}> = ({
  mcpId,
  name,
  prompts,
  isExpanded,
  selectedPromptCount,
  areAllPromptsSelected,
  onToggleSection,
  onToggleAllPrompts,
  onTogglePrompt,
  isPromptSelected,
}) => {
  return (
    <div key={mcpId}>
      <div className="text-foreground bg-accent sticky top-0 z-10 flex flex-col gap-1 p-2">
        <div
          onClick={onToggleSection}
          className="flex cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-2 select-none">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-semibold">{name}</span>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-xs select-none",
              !selectedPromptCount && "opacity-0",
            )}
          >
            {selectedPromptCount || 0}
          </Badge>
        </div>
      </div>

      {isExpanded && (
        <div className="">
          <div
            className="flex cursor-pointer items-center p-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAllPrompts();
            }}
          >
            <div className="flex w-full items-center gap-2">
              <Checkbox checked={areAllPromptsSelected} />
              <Label className="text-foreground cursor-pointer text-sm font-medium">
                Select All
              </Label>
            </div>
          </div>

          {prompts.map((prompt) => (
            <PromptItem
              key={mcpId + prompt.name}
              prompt={prompt}
              mcpId={mcpId}
              isSelected={isPromptSelected(prompt.name)}
              onToggle={() => onTogglePrompt(prompt.name)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const McpResourceSection: React.FC<{
  mcpId: string;
  name: string;
  resources: Resource[];
  isExpanded: boolean;
  selectedResourceCount: number;
  areAllResourcesSelected: boolean;
  onToggleSection: () => void;
  onToggleAllResources: () => void;
  onToggleResource: (resourceId: string) => void;
  isResourceSelected: (resourceId: string) => boolean;
}> = ({
  mcpId,
  name,
  resources,
  isExpanded,
  selectedResourceCount,
  areAllResourcesSelected,
  onToggleSection,
  onToggleAllResources,
  onToggleResource,
  isResourceSelected,
}) => {
  return (
    <div key={mcpId}>
      <div className="text-foreground bg-accent sticky top-0 z-10 flex flex-col gap-1 p-2">
        <div
          onClick={onToggleSection}
          className="flex cursor-pointer items-center justify-between"
        >
          <div className="flex items-center gap-2 select-none">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-semibold">{name}</span>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-xs select-none",
              !selectedResourceCount && "opacity-0",
            )}
          >
            {selectedResourceCount || 0}
          </Badge>
        </div>
      </div>

      {isExpanded && (
        <div className="">
          <div
            className="flex cursor-pointer items-center p-2"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAllResources();
            }}
          >
            <div className="flex w-full items-center gap-2">
              <Checkbox checked={areAllResourcesSelected} />
              <Label className="text-foreground cursor-pointer text-sm font-medium">
                Select All
              </Label>
            </div>
          </div>

          {resources.map((resource) => (
            <ResourceItem
              key={mcpId + resource.uri}
              resource={resource}
              mcpId={mcpId}
              isSelected={isResourceSelected(resource.uri)}
              onToggle={() => onToggleResource(resource.uri)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function CapabilitiesSidebar() {
  const {
    mcps,
    totalCounts,
    selectedCounts,
    expandedSections,
    modifiedToolMap,
    toggleSection,
    handleToggleTool,
    handleToggleAllTools,
    handleToggleAllPrompts,
    handleToggleAllResources,
    handleTogglePrompt,
    handleToggleResource,
    isToolSelected,
    areAllToolsSelected,
    areAllPromptsSelected,
    areAllResourcesSelected,
    isPromptSelected,
    isResourceSelected,
    getModifiedName,
    getModifiedTool,
    revertTool,
    modifyTool,
    mcpCapabilitiesMap,
  } = useCapabilitiesSidebar();

  if (!mcpCapabilitiesMap || Object.keys(mcpCapabilitiesMap).length === 0) {
    return null;
  }

  return (
    <Sidebar
      side="right"
      className="top-[var(--tab-header-height)] !h-[calc(100svh-var(--tab-header-height))]"
    >
      <ToolSidebarHeader toolCount={totalCounts.all} />
      <SidebarContent className="gap-0 overflow-x-hidden overflow-y-auto">
        <Tabs defaultValue="tools" className="w-full">
          <TabsList className="bg-background sticky top-0 z-10 grid w-full grid-cols-3">
            <TabsTrigger value="tools" className="flex items-center gap-1">
              Tools
              {totalCounts.tools > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {totalCounts.tools}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1">
              Prompts
              {totalCounts.prompts > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {totalCounts.prompts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              Resources
              {totalCounts.resources > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {totalCounts.resources}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-0 space-y-0">
            {[...mcps]
              .sort(([, a], [, b]) => {
                const nameA = (a.name as string).toLowerCase();
                const nameB = (b.name as string).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .filter(
                ([, mcpData]) => mcpData.tools && mcpData.tools.length > 0,
              )
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
                    selectedToolCount={selectedCounts[mcpId]?.tools || 0}
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
          </TabsContent>

          <TabsContent value="prompts" className="mt-0 space-y-0">
            {[...mcps]
              .sort(([, a], [, b]) => {
                const nameA = (a.name as string).toLowerCase();
                const nameB = (b.name as string).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .filter(
                ([, mcpData]) => mcpData.prompts && mcpData.prompts.length > 0,
              )
              .map(([mcpId, mcpData]) => {
                const name = mcpData.name as string;
                const prompts = mcpData.prompts as Prompt[];
                return (
                  <McpPromptSection
                    key={mcpId}
                    mcpId={mcpId}
                    name={name}
                    prompts={prompts}
                    isExpanded={expandedSections[mcpId]}
                    selectedPromptCount={selectedCounts[mcpId]?.prompts || 0}
                    areAllPromptsSelected={areAllPromptsSelected(
                      mcpId,
                      prompts,
                    )}
                    onToggleSection={() => toggleSection(mcpId)}
                    onToggleAllPrompts={() =>
                      handleToggleAllPrompts(mcpId, prompts)
                    }
                    onTogglePrompt={(promptId) =>
                      handleTogglePrompt(mcpId, promptId)
                    }
                    isPromptSelected={(promptId) =>
                      isPromptSelected(mcpId, promptId)
                    }
                  />
                );
              })}
          </TabsContent>

          <TabsContent value="resources" className="mt-0 space-y-0">
            {[...mcps]
              .sort(([, a], [, b]) => {
                const nameA = (a.name as string).toLowerCase();
                const nameB = (b.name as string).toLowerCase();
                return nameA.localeCompare(nameB);
              })
              .filter(
                ([, mcpData]) =>
                  mcpData.resources && mcpData.resources.length > 0,
              )
              .map(([mcpId, mcpData]) => {
                const name = mcpData.name as string;
                const resources = mcpData.resources as Resource[];
                return (
                  <McpResourceSection
                    key={mcpId}
                    mcpId={mcpId}
                    name={name}
                    resources={resources}
                    isExpanded={expandedSections[mcpId]}
                    selectedResourceCount={
                      selectedCounts[mcpId]?.resources || 0
                    }
                    areAllResourcesSelected={areAllResourcesSelected(
                      mcpId,
                      resources,
                    )}
                    onToggleSection={() => toggleSection(mcpId)}
                    onToggleAllResources={() =>
                      handleToggleAllResources(mcpId, resources)
                    }
                    onToggleResource={(resourceId) =>
                      handleToggleResource(mcpId, resourceId)
                    }
                    isResourceSelected={(resourceId) =>
                      isResourceSelected(mcpId, resourceId)
                    }
                  />
                );
              })}
          </TabsContent>
        </Tabs>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
