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
import { Box, Plug, SquareTerminal, Upload, Trash2, RefreshCw, Server } from "lucide-react";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { useApis } from "@/hooks/useApis";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
   
  export function AppSidebar() {
  const { apis, isLoading, error, isError, refetch, deleteApi } = useApis();

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
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>APIs</SidebarGroupLabel>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5" 
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
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  No APIs found. Import one to get started.
                </div>
              </SidebarMenuItem>
            ) : (
              apis.map((apiItem) => (
                <SidebarMenuItem key={apiItem.id}>
                  <div className="flex w-full items-center justify-between group">
                    <SidebarMenuButton className="flex-1 text-xs">
                      <Server className="!size-3" /> {apiItem.api.name}
                    </SidebarMenuButton>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteApi(apiItem.id, apiItem.api.name);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete API</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </SidebarMenuItem>
              ))
            )}
            <SidebarMenuItem>
              <ImportApiDialog>
                <SidebarMenuButton className="text-xs">
                  <Upload className="!size-3" /> Upload OpenAPI spec
                </SidebarMenuButton>
              </ImportApiDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>MCPs</SidebarGroupLabel>
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