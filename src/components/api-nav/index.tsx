import React, { useState, useMemo } from "react";
import { SidebarGroup, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Upload } from "lucide-react";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { useApis } from "@/hooks/useApis";
import { toast } from "sonner";
import { useLocation } from "@tanstack/react-router";
import { ApiHeader } from "./ApiHeader";
import { ApiItem } from "./ApiItem";
import { Loader } from "@/components/Loader";
import { ApiItemErrorBoundary } from "./ApiItemErrorBoundary";


export function ApiNav() {
  const { apis, isLoading, error, isError, refetch, deleteApi, renameApi } = useApis();
  const [openApiIds, setOpenApiIds] = useState<string[]>([]);
  const location = useLocation();
  const { apiId, isExactMatch } = useMemo(() => {
    const match = location.pathname.match(/\/api\/([^/]+)/);
    const apiId = match ? match[1] : undefined;
    // Check if there's anything after the API ID in the URL
    const isExactMatch = match ? location.pathname === `/api/${match[1]}` : false;
    return { apiId, isExactMatch };
  }, [location.pathname]);
  
  const toggleApiCollapsible = (apiId: string) => {
    const isCurrentlyOpen = openApiIds.includes(apiId);
    
    setOpenApiIds(prev => 
      isCurrentlyOpen ? prev.filter(id => id !== apiId) : [...prev, apiId]
    );
  };

  return (
    <SidebarGroup>
      <ApiHeader isLoading={isLoading} refetch={refetch} />
      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs flex items-center justify-center">
              <Loader className="mr-2" /> Loading APIs...
            </div>
          </SidebarMenuItem>
        ) : isError ? (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs text-red-500">
              Failed to load APIs. Please try refreshing.
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </SidebarMenuItem>
        ) : apis.length === 0 ? (
          <SidebarMenuItem>
            <ImportApiDialog>
              <div className="text-xs flex items-center px-2 py-1">
                <Upload className="size-3 mr-2" /> Upload OpenAPI spec
              </div>
            </ImportApiDialog>
          </SidebarMenuItem>
        ) : (
          <>
            {apis.map((apiItem) => (
                  <ApiItemErrorBoundary                 key={apiItem.id}
                  apiId={apiItem.id}>

              <ApiItem
                apiItem={apiItem}
                isOpen={openApiIds.includes(apiItem.id)}
                isActive={apiItem.id === apiId && isExactMatch}
                onToggle={toggleApiCollapsible}
                deleteApi={deleteApi}
                renameApi={renameApi}
              />
              </ApiItemErrorBoundary>
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}