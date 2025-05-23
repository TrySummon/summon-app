import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BadgeCheck, Folder } from "lucide-react";
import { cn } from "@/utils/tailwind";
import { Checkbox } from "@/components/ui/checkbox";
import { MethodBadge } from "@/components/MethodBadge";
import { OpenAPIV3 } from "openapi-types";

interface EndpointPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: {
    id: string;
    api: OpenAPIV3.Document;
  };
  onEndpointsUpdate?: (selectedEndpointIds: string[]) => void;
  initialSelectedEndpoints?: string[];
  onBackClick?: () => void;
}

export function EndpointPickerDialog({ 
  open, 
  onOpenChange, 
  api, 
  onEndpointsUpdate,
  initialSelectedEndpoints = [],
  onBackClick
}: EndpointPickerDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>(initialSelectedEndpoints);
  
  // Reset selected endpoints when API changes
  React.useEffect(() => {
    setSelectedEndpoints(initialSelectedEndpoints);
  }, [api.id, initialSelectedEndpoints]);

  // Group endpoints by folder
  const { folders, endpointsByFolder } = useMemo(() => {
    const result: Record<string, Array<{
      path: string;
      method: string;
    }>> = {};
    const folderList: string[] = [];

    if (!api?.api?.paths) return { folders: [], endpointsByFolder: {} };

    // First, collect all endpoints
    Object.entries(api.api.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      // Get folder name from path
      const pathParts = path.split('/');
      let folderName = pathParts[1] || 'root';
      if (!folderName || folderName === '') folderName = 'root';

      // Initialize folder if it doesn't exist
      if (!result[folderName]) {
        result[folderName] = [];
        folderList.push(folderName);
      }

      // Add endpoints to folder
      const methods = ["get", "post", "put", "delete", "patch", "options", "head"] as const;
      methods.forEach((method) => {
        const operation = pathItem[method];
        if (!operation) return;

        result[folderName].push({
          path,
          method,
        });
      });
    });

    // Set the first folder as selected by default if available
    if (folderList.length > 0 && !selectedFolder) {
      setSelectedFolder(folderList[0]);
    }

    return { 
      folders: folderList.sort(), 
      endpointsByFolder: result 
    };
  }, [api, selectedFolder]);
  
  // Count selected endpoints per folder
  const selectedCountByFolder = useMemo(() => {
    const result: Record<string, number> = {};
    
    if (selectedEndpoints.length > 0 && endpointsByFolder) {
      Object.keys(endpointsByFolder).forEach(folder => {
        const folderEndpoints = endpointsByFolder[folder] || [];
        const selectedCount = folderEndpoints.filter(endpoint => 
          selectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`)
        ).length;
        
        if (selectedCount > 0) {
          result[folder] = selectedCount;
        }
      });
    }
    
    return result;
  }, [endpointsByFolder, selectedEndpoints]);

  const selectFolder = (folderName: string) => {
    setSelectedFolder(folderName);
  };

  const toggleEndpointSelection = (endpointId: string) => {
    setSelectedEndpoints(prev => 
      prev.includes(endpointId)
        ? prev.filter(id => id !== endpointId)
        : [...prev, endpointId]
    );
  };
  
  // Toggle all endpoints in the current folder
  const toggleAllEndpoints = (checked: boolean) => {
    if (!selectedFolder || !endpointsByFolder[selectedFolder]) return;
    
    const folderEndpoints = endpointsByFolder[selectedFolder];
    const folderEndpointIds = folderEndpoints.map(endpoint => 
      `${endpoint.method}-${endpoint.path}`
    );
    
    if (checked) {
      // Add all folder endpoints that aren't already selected
      setSelectedEndpoints(prev => {
        const newEndpoints = folderEndpointIds.filter(id => !prev.includes(id));
        return [...prev, ...newEndpoints];
      });
    } else {
      // Remove all folder endpoints
      setSelectedEndpoints(prev => 
        prev.filter(id => !folderEndpointIds.includes(id))
      );
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-5/6 p-0 gap-0 overflow-hidden sm:max-w-none flex flex-col">
        <div className="flex items-center p-6 border-b flex-shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2"
            onClick={() => {
              if (onBackClick) {
                onBackClick();
              }
              onOpenChange(false);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg font-bold text-primary">
                {api?.api?.info?.title?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div>
              <DialogTitle className="text-lg">{api?.api?.info?.title}</DialogTitle>
              <div className="text-sm text-muted-foreground flex items-center">
                By {api?.api?.info?.contact?.name || "Unknown"}
                {api?.api?.info?.contact?.name && (
                  <BadgeCheck className="size-3 ml-1 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left column - API folders */}
          <div className="w-1/4 border-r overflow-y-auto bg-muted/5">
            <ul className="flex w-full min-w-0 flex-col gap-1 p-2">
              {folders.map((folderName) => {
                const selectedCount = selectedCountByFolder[folderName] || 0;
                return (
                  <li key={folderName} className="relative">
                    <div 
                      className={cn(
                        "flex w-full items-center gap-2 overflow-hidden rounded-md p-1.5 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                        selectedFolder === folderName ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : ""
                      )}
                      onClick={() => selectFolder(folderName)}
                    >
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {folderName === 'root' ? 'Root' : folderName}
                      </span>
                      {selectedCount > 0 && (
                        <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {folders.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No API endpoints available
              </div>
            )}
          </div>

          {/* Right column - Endpoint list for selected folder */}
          <div className="w-3/4 overflow-y-auto">
            {selectedFolder && endpointsByFolder[selectedFolder] ? (
              <div>
                <div className="px-4 py-3 border-b bg-muted/5 flex items-center">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={selectedFolder && endpointsByFolder[selectedFolder] ? 
                        endpointsByFolder[selectedFolder].every(endpoint => 
                          selectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`)
                        ) : false
                      }
                      onCheckedChange={toggleAllEndpoints}
                    />
                    <div>
                      <h3 className="font-medium">{selectedFolder === 'root' ? 'Root' : selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)} Endpoints</h3>
                      <p className="text-xs text-muted-foreground">
                        Select endpoints to include in your MCP server
                      </p>
                    </div>
                  </div>
                </div>
                {endpointsByFolder[selectedFolder].map((endpoint) => {
                  const endpointId = `${endpoint.method}-${endpoint.path}`;
                  const isSelected = selectedEndpoints.includes(endpointId);
                  
                  return (
                    <div 
                      key={endpointId}
                      className="px-4 py-3 border-b hover:bg-muted/5 cursor-pointer"
                      onClick={() => toggleEndpointSelection(endpointId)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          id={endpointId} 
                          checked={isSelected}
                          onCheckedChange={() => toggleEndpointSelection(endpointId)}
                          className="pointer-events-none"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MethodBadge method={endpoint.method} size="md" />
                            <span className="font-mono text-sm">{endpoint.path}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a folder to view endpoints
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t flex-shrink-0">
          <Button className="mr-2" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            if (onEndpointsUpdate) {
              onEndpointsUpdate(selectedEndpoints);
            }
            onOpenChange(false);
          }}>
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}