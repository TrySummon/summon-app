import React, { useState, useMemo } from "react";
import { SidebarGroup, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Upload } from "lucide-react";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { useApis } from "@/hooks/useApis";
import { toast } from "sonner";
import { useLocation } from "@tanstack/react-router";
import { ApiHeader } from "./ApiHeader";
import { ApiItem } from "./ApiItem";


export function ApiNav() {
  const { apis, isLoading, error, isError, refetch, deleteApi, renameApi } = useApis();
  const [openApiIds, setOpenApiIds] = useState<string[]>([]);
  const [editingApiId, setEditingApiId] = useState<string | null>(null);
  const [tempApiName, setTempApiName] = useState<string>("");
  
  const location = useLocation();
  const apiId = useMemo(() => {
    const match = location.pathname.match(/\/api\/([^/]+)/);
    return match ? match[1] : undefined;
  }, [location.pathname]);
  
  const toggleApiCollapsible = (apiId: string) => {
    const isCurrentlyOpen = openApiIds.includes(apiId);
    
    setOpenApiIds(prev => 
      isCurrentlyOpen ? prev.filter(id => id !== apiId) : [...prev, apiId]
    );
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
  };

  const finishRenameApi = (newName?: string) => {
    if (!editingApiId || !newName) {
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
      setEditingApiId(null);
    }
  };

  return (
    <SidebarGroup>
      <ApiHeader isLoading={isLoading} refetch={refetch} />
      <SidebarMenu>
        {isError ? (
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
              <ApiItem
                key={apiItem.id}
                apiItem={apiItem}
                isOpen={openApiIds.includes(apiItem.id)}
                isActive={apiItem.id === apiId}
                editingApiId={editingApiId}
                onToggle={toggleApiCollapsible}
                onRename={startRenameApi}
                onDelete={handleDeleteApi}
                onFinishRename={finishRenameApi}
                onRenameKeyDown={handleRenameKeyDown}
                tempApiName={tempApiName}
              />
            ))}
          </>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}