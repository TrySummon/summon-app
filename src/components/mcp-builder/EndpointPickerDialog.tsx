import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, BadgeCheck, Folder, Search, X } from "lucide-react";
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
  onBackClick,
}: EndpointPickerDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>(
    initialSelectedEndpoints,
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Reset selected endpoints when API changes
  React.useEffect(() => {
    setSelectedEndpoints(initialSelectedEndpoints);
  }, [api.id, initialSelectedEndpoints]);

  // Group endpoints by folder
  const { folders, endpointsByFolder } = useMemo(() => {
    const result: Record<
      string,
      Array<{
        path: string;
        method: string;
      }>
    > = {};
    const folderList: string[] = [];

    if (!api?.api?.paths) return { folders: [], endpointsByFolder: {} };

    // First, collect all endpoints
    Object.entries(api.api.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      // Get folder name from path
      const pathParts = path.split("/");
      let folderName = pathParts[1] || "root";
      if (!folderName || folderName === "") folderName = "root";

      // Initialize folder if it doesn't exist
      if (!result[folderName]) {
        result[folderName] = [];
        folderList.push(folderName);
      }

      // Add endpoints to folder
      const methods = [
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "options",
        "head",
      ] as const;
      methods.forEach((method) => {
        const operation = pathItem[method];
        if (!operation) return;

        const endpoint = { path, method };
        result[folderName].push(endpoint);
      });
    });

    // Set the first folder as selected by default if available
    if (folderList.length > 0 && !selectedFolder) {
      // eslint-disable-next-line react-compiler/react-compiler
      setSelectedFolder(folderList[0]);
    }

    return {
      folders: folderList.sort(),
      endpointsByFolder: result,
    };
  }, [api, selectedFolder]);

  // Count selected endpoints per folder
  const selectedCountByFolder = useMemo(() => {
    const result: Record<string, number> = {};

    if (selectedEndpoints.length > 0 && endpointsByFolder) {
      Object.keys(endpointsByFolder).forEach((folder) => {
        const folderEndpoints = endpointsByFolder[folder] || [];
        const selectedCount = folderEndpoints.filter((endpoint) =>
          selectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`),
        ).length;

        if (selectedCount > 0) {
          result[folder] = selectedCount;
        }
      });
    }

    return result;
  }, [endpointsByFolder, selectedEndpoints]);

  // Filter endpoints in the selected folder based on search query
  const filteredEndpoints = useMemo(() => {
    if (!selectedFolder || !endpointsByFolder[selectedFolder]) return [];

    const folderEndpoints = endpointsByFolder[selectedFolder];

    if (!searchQuery.trim()) return folderEndpoints;

    return folderEndpoints.filter((endpoint) =>
      endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [selectedFolder, endpointsByFolder, searchQuery]);

  const selectFolder = (folderName: string) => {
    setSelectedFolder(folderName);
  };

  const toggleEndpointSelection = (endpointId: string) => {
    setSelectedEndpoints((prev) =>
      prev.includes(endpointId)
        ? prev.filter((id) => id !== endpointId)
        : [...prev, endpointId],
    );
  };

  // Toggle all endpoints in the current folder (filtered by search)
  const toggleAllEndpoints = (checked: boolean) => {
    if (filteredEndpoints.length === 0) return;

    const endpointIds = filteredEndpoints.map(
      (endpoint) => `${endpoint.method}-${endpoint.path}`,
    );

    if (checked) {
      // Add all filtered endpoints that aren't already selected
      setSelectedEndpoints((prev) => {
        const newEndpoints = endpointIds.filter((id) => !prev.includes(id));
        return [...prev, ...newEndpoints];
      });
    } else {
      // Remove all filtered endpoints
      setSelectedEndpoints((prev) =>
        prev.filter((id) => !endpointIds.includes(id)),
      );
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  const allFilteredEndpointsSelected =
    filteredEndpoints.length > 0 &&
    filteredEndpoints.every((endpoint) =>
      selectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`),
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <div className="flex flex-shrink-0 items-center border-b p-6">
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
            <div className="bg-primary/10 mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
              <span className="text-primary text-lg font-bold">
                {api?.api?.info?.title?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div>
              <DialogTitle className="text-lg">
                {api?.api?.info?.title}
              </DialogTitle>
              <div className="text-muted-foreground flex items-center text-sm">
                By {api?.api?.info?.contact?.name || "Unknown"}
                {api?.api?.info?.contact?.name && (
                  <BadgeCheck className="ml-1 size-3 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-muted/5 flex-shrink-0 border-b p-2 px-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transform" />
            <Input
              placeholder="Search endpoints by path in selected folder"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background h-12 border-0 pr-12 pl-12 text-lg shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 transform"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left column - API folders */}
          <div className="bg-muted/5 w-1/4 overflow-y-auto border-r">
            <ul className="flex w-full min-w-0 flex-col gap-1 p-2">
              {folders.map((folderName) => {
                const selectedCount = selectedCountByFolder[folderName] || 0;
                return (
                  <li key={folderName} className="relative">
                    <div
                      className={cn(
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-1.5 text-left text-sm",
                        selectedFolder === folderName
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "",
                      )}
                      onClick={() => selectFolder(folderName)}
                    >
                      <Folder className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {folderName === "root" ? "Root" : folderName}
                      </span>
                      {selectedCount > 0 && (
                        <span className="ml-auto rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {folders.length === 0 && (
              <div className="text-muted-foreground p-4 text-center">
                No API endpoints available
              </div>
            )}
          </div>

          {/* Right column - Endpoint list */}
          <div className="w-3/4 overflow-y-auto">
            {filteredEndpoints.length > 0 ? (
              <div>
                <div className="bg-muted/5 flex items-center border-b px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allFilteredEndpointsSelected}
                      onCheckedChange={toggleAllEndpoints}
                    />
                    <div>
                      <h3 className="font-medium">
                        {selectedFolder === "root"
                          ? "Root"
                          : selectedFolder
                            ? selectedFolder.charAt(0).toUpperCase() +
                              selectedFolder.slice(1)
                            : ""}{" "}
                        Endpoints
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        Select endpoints to include in your MCP server
                      </p>
                    </div>
                  </div>
                </div>
                {filteredEndpoints.map((endpoint) => {
                  const endpointId = `${endpoint.method}-${endpoint.path}`;
                  const isSelected = selectedEndpoints.includes(endpointId);

                  return (
                    <div
                      key={endpointId}
                      className="hover:bg-muted/5 cursor-pointer border-b px-4 py-3"
                      onClick={() => toggleEndpointSelection(endpointId)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={endpointId}
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleEndpointSelection(endpointId)
                          }
                          className="pointer-events-none"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <MethodBadge method={endpoint.method} size="md" />
                            <span className="font-mono text-sm">
                              {searchQuery.trim()
                                ? // Highlight search term in results
                                  endpoint.path
                                    .split(new RegExp(`(${searchQuery})`, "gi"))
                                    .map((part, index) =>
                                      part.toLowerCase() ===
                                      searchQuery.toLowerCase() ? (
                                        <span
                                          key={index}
                                          className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
                                        >
                                          {part}
                                        </span>
                                      ) : (
                                        <span key={index}>{part}</span>
                                      ),
                                    )
                                : endpoint.path}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                <Search className="mb-2 h-8 w-8 opacity-50" />
                <p>No endpoints found in "{selectedFolder}"</p>
                <p className="mt-1 text-sm">
                  Try a different folder or search term
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 justify-end border-t p-6">
          <Button
            className="mr-2"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              if (onEndpointsUpdate) {
                onEndpointsUpdate(selectedEndpoints);
              }
              onOpenChange(false);
            }}
          >
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
