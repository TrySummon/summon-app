import React, { useState, useRef, useEffect } from "react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuAction
} from "@/components/ui/sidebar";
import { Upload, RefreshCw, Plus, ChevronRight, ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { useApis } from "@/hooks/useApis";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { listApiTools } from "@/helpers/ipc/openapi/openapi-client";
import { McpToolDefinition } from "@/helpers/openapi/types";
import { ApiTool } from "@/components/ApiTool";
import { useNavigate, useMatch, useRouterState } from "@tanstack/react-router";

function useApiMatch() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  
  // Only try to use useMatch if we're actually on an API route
  if (currentPath.startsWith('/api/')) {
    try {
      return useMatch({ from: "/api/$apiId" });
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

export function ApiSection() {
  const { apis, isLoading, error, isError, refetch, deleteApi, renameApi } = useApis();
  const [isHovering, setIsHovering] = useState(false);
  const [openApiIds, setOpenApiIds] = useState<string[]>([]);
  const [apiTools, setApiTools] = useState<Record<string, McpToolDefinition[]>>({});
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [tempApiName, setTempApiName] = useState<string>("");
  const editableNameRef = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();

    const apiMatch = useApiMatch();
 
  
  // Ref to track if rename action initiated the dropdown close
  const renameInitiatedRef = useRef(false); 
  
  const toggleApiCollapsible = async (apiId: string) => {
    const isCurrentlyOpen = openApiIds.includes(apiId);
    
    setOpenApiIds(prev => 
      isCurrentlyOpen ? prev.filter(id => id !== apiId) : [...prev, apiId]
    );
    
    if (!isCurrentlyOpen && !apiTools[apiId]) {
      try {
        const result = await listApiTools(apiId);
        if (result.success) {
          setApiTools(prev => ({
            ...prev,
            [apiId]: result.tools || []
          }));
        }
      } catch (err) {
        console.error('Failed to load API tools:', err);
      }
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("API list refreshed");
  };

  const handleDeleteApi = (apiId: string, apiName: string) => {
    if (confirm(`Are you sure you want to delete the API "${apiName}"?`)) {
      deleteApi(apiId, {
        onSuccess: () => {
          toast.success(`API "${apiName}" deleted successfully`);
        },
        onError: (error) => {
          toast.error(`Failed to delete API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
    }
  };

  const startRenameApi = (apiId: string, currentName: string) => {
    setEditingApiId(apiId);
    setTempApiName(currentName);
    renameInitiatedRef.current = true; // Signal that rename action is causing dropdown to close
  };

  const finishRenameApi = () => {
    if (!editingApiId || !editableNameRef.current) return;
    
    const newName = editableNameRef.current.textContent?.trim();
    if (!newName || newName === tempApiName) {
      setEditingApiId(null);
      return;
    }
    
    renameApi({ apiId: editingApiId, newName }, {
      onSuccess: () => {
        toast.success(`API renamed to "${newName}" successfully`);
        setEditingApiId(null);
      },
      onError: (error) => {
        toast.error(`Failed to rename API: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setEditingApiId(null); 
      }
    });
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishRenameApi();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Reset the content editable to the original name before canceling edit mode
      if (editableNameRef.current && tempApiName) {
        editableNameRef.current.textContent = tempApiName;
      }
      setEditingApiId(null);
    }
  };


  return (
    <SidebarGroup>
      <div 
        className="flex items-center justify-between"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <SidebarGroupLabel>APIs</SidebarGroupLabel>
        <div className={`flex items-center transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 mr-1" 
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh API list</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <ImportApiDialog>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </ImportApiDialog>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add new API</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <SidebarMenu>
        {isError ? (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs text-red-500">
              Failed to load APIs. Please try refreshing.
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </SidebarMenuItem>
        ) : isLoading ? (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Loading APIs...
            </div>
          </SidebarMenuItem>
        ) : apis.length === 0 ? (
          <SidebarMenuItem>
            <ImportApiDialog>
              <SidebarMenuButton className="text-xs">
                <Upload className="!size-3" /> Upload OpenAPI spec
              </SidebarMenuButton>
            </ImportApiDialog>
          </SidebarMenuItem>
        ) : (
          <>
            {apis.map((apiItem) => (
              <Collapsible
                key={apiItem.id}
                open={openApiIds.includes(apiItem.id)}
                onOpenChange={() => toggleApiCollapsible(apiItem.id)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                    isActive={apiItem.id === apiMatch?.params.apiId}
                    onClick={() => navigate({ to: "/api/$apiId", params: { apiId: apiItem.id } })} className="flex-1 text-xs">
                      <div className="flex items-center">
                        <div onClick={(e) => {
                          e.stopPropagation()
                          toggleApiCollapsible(apiItem.id)
                        }} className="mr-2 flex items-center chevron">
                          <ChevronRight className="h-3 w-3 ml-auto group-data-[state=open]/collapsible:hidden" />
                          <ChevronDown className="h-3 w-3 ml-auto group-data-[state=closed]/collapsible:hidden" />
                        </div>
                        {editingApiId === apiItem.id ? (
                          <span 
                            ref={editableNameRef}
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={finishRenameApi}
                            onKeyDown={handleRenameKeyDown}
                            className="outline-none border-b border-dashed border-primary px-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {apiItem.api.name}
                          </span>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-primary transition-colors"
                          >
                            {apiItem.api.name}
                          </span>
                        )}
                      </div>
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover>
                        <MoreHorizontal className="h-3 w-3" />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-38"
                      side="right"
                      align="start"
                      onCloseAutoFocus={(event) => { // Add this prop
                        if (renameInitiatedRef.current) {
                          event.preventDefault();
                          if(editableNameRef.current){
                            // Set cursor at the end
                            const el = editableNameRef.current;
                            const selection = window.getSelection();
                            if (selection) { 
                              const range = document.createRange();
                              range.selectNodeContents(el);
                              range.collapse(false); 
                              selection.removeAllRanges();
                              selection.addRange(range);
                            }
                          }
                          renameInitiatedRef.current = false; // Reset the flag
                        }
                      }}
                    >
                      <DropdownMenuItem className="text-xs" onSelect={() => startRenameApi(apiItem.id, apiItem.api.name)}>
                        <Pencil className="mr-2 !size-3 text-muted-foreground" />
                        <span>Rename API</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs" onSelect={() => handleDeleteApi(apiItem.id, apiItem.api.name)}>
                        <Trash2 className="mr-2 !size-3 text-muted-foreground" />
                        <span>Delete API</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {apiTools[apiItem.id]?.map((tool, index) => (
                        <ApiTool 
                          key={`${apiItem.id}-tool-${index}`}
                          tool={tool}
                        />
                      ))}
                      {(!apiTools[apiItem.id] || apiTools[apiItem.id].length === 0) && (
                        <SidebarMenuSubItem>
                          <div className="px-4 py-2 text-xs text-muted-foreground">
                            No tools available
                          </div>
                        </SidebarMenuSubItem>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}