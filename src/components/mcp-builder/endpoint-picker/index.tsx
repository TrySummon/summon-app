import React, { useState, useMemo, useRef, useEffect, Fragment } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OpenAPIV3 } from "openapi-types";
import { Endpoint, EndpointWithScore } from "./types";
import { DialogHeader } from "./DialogHeader";
import { SearchBar } from "./SearchBar";
import { FolderFilterChips } from "./FolderFilterChips";
import { EndpointList } from "./EndpointList";
import { FolderList } from "./FolderList";
import { DialogFooter } from "./DialogFooter";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ApiExplorer } from "@/components/api-explorer";
import { cn } from "@/utils/tailwind";

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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>("");
  const [selectedSearchFolders, setSelectedSearchFolders] = useState<string[]>(
    [],
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEndpointForDetails, setSelectedEndpointForDetails] = useState<{
    path: string;
    method: string;
  } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset selected endpoints when API changes
  React.useEffect(() => {
    setSelectedEndpoints(initialSelectedEndpoints);
  }, [api.id, initialSelectedEndpoints]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Collect all endpoints with metadata
  const allEndpoints = useMemo(() => {
    const endpoints: Endpoint[] = [];

    if (!api?.api?.paths) return endpoints;

    Object.entries(api.api.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      // Get folder name from path
      const pathParts = path.split("/");
      let folderName = pathParts[1] || "root";
      if (!folderName || folderName === "") folderName = "root";

      // Add endpoints to collection
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

        endpoints.push({
          path,
          method,
          folder: folderName,
          summary: operation.summary,
          description: operation.description,
          operationId: operation.operationId,
        });
      });
    });

    return endpoints;
  }, [api]);

  // Group endpoints by folder for folder view
  const { folders, endpointsByFolder } = useMemo(() => {
    const result: Record<string, Endpoint[]> = {};
    const folderList: string[] = [];

    allEndpoints.forEach((endpoint) => {
      if (!result[endpoint.folder]) {
        result[endpoint.folder] = [];
        folderList.push(endpoint.folder);
      }
      result[endpoint.folder].push(endpoint);
    });

    return {
      folders: folderList.sort(),
      endpointsByFolder: result,
    };
  }, [allEndpoints]);

  // Set the first folder as selected by default if available and no folder is selected
  useEffect(() => {
    if (folders.length > 0 && !selectedFolder) {
      setSelectedFolder(folders[0]);
    }
  }, [folders, selectedFolder]);

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

  // Smart search function with scoring
  const searchEndpoints = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];

    const query = debouncedSearchQuery.toLowerCase().trim();
    const searchResults = allEndpoints
      .map((endpoint) => {
        let score = 0;
        let matchedText = "";

        // Path matching (highest priority)
        const pathLower = endpoint.path.toLowerCase();
        if (pathLower.includes(query)) {
          score += 100;
          // Bonus for exact matches or matches at start
          if (pathLower === query) score += 50;
          else if (pathLower.startsWith(query)) score += 30;
          else if (pathLower.includes(`/${query}`)) score += 20;
          matchedText = endpoint.path;
        }

        // Method matching
        if (endpoint.method.toLowerCase().includes(query)) {
          score += 80;
          matchedText = matchedText || endpoint.method;
        }

        // Summary matching
        if (endpoint.summary?.toLowerCase().includes(query)) {
          score += 60;
          matchedText = matchedText || endpoint.summary;
        }

        // Operation ID matching
        if (endpoint.operationId?.toLowerCase().includes(query)) {
          score += 70;
          matchedText = matchedText || endpoint.operationId;
        }

        // Description matching (lower priority)
        if (endpoint.description?.toLowerCase().includes(query)) {
          score += 40;
          matchedText = matchedText || endpoint.description;
        }

        // Folder matching (lowest priority)
        if (endpoint.folder.toLowerCase().includes(query)) {
          score += 20;
          matchedText = matchedText || endpoint.folder;
        }

        // Bonus for shorter paths (prefer more specific matches)
        if (score > 0) {
          score += Math.max(0, 50 - endpoint.path.length);
        }

        return score > 0 ? { ...endpoint, score, matchedText } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        // First sort by score (descending)
        if (b!.score !== a!.score) return b!.score - a!.score;
        // Then by path length (ascending - shorter first)
        return a!.path.length - b!.path.length;
      });

    return searchResults as EndpointWithScore[];
  }, [allEndpoints, debouncedSearchQuery]);

  // Get folder counts for search results
  const searchFolderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchEndpoints.forEach((endpoint) => {
      counts[endpoint.folder] = (counts[endpoint.folder] || 0) + 1;
    });
    return counts;
  }, [searchEndpoints]);

  // Filter search results by selected folders
  const filteredSearchEndpoints = useMemo(() => {
    if (selectedSearchFolders.length === 0) {
      return searchEndpoints; // Show all if no folders selected
    }
    return searchEndpoints.filter((endpoint) =>
      selectedSearchFolders.includes(endpoint.folder),
    );
  }, [searchEndpoints, selectedSearchFolders]);

  // Clear search and reset folder filters, but preserve selections
  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedSearchFolders([]);
    // Don't clear selectedEndpoints - preserve user selections
  };

  // Toggle folder selection in search mode
  const toggleSearchFolder = (folderName: string) => {
    setSelectedSearchFolders((prev) =>
      prev.includes(folderName)
        ? prev.filter((f) => f !== folderName)
        : [...prev, folderName],
    );
  };

  // Filter endpoints in the selected folder for folder view
  const filteredEndpoints = useMemo(() => {
    if (!selectedFolder || !endpointsByFolder[selectedFolder]) return [];
    return endpointsByFolder[selectedFolder];
  }, [selectedFolder, endpointsByFolder]);

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

  // Toggle all visible endpoints
  const toggleAllEndpoints = (checked: boolean) => {
    const endpointIds = currentVisibleEndpoints.map(
      (endpoint) => `${endpoint.method}-${endpoint.path}`,
    );

    if (checked) {
      // Add all visible endpoints that aren't already selected
      setSelectedEndpoints((prev) => {
        const newEndpoints = endpointIds.filter((id) => !prev.includes(id));
        return [...prev, ...newEndpoints];
      });
    } else {
      // Remove only the currently visible endpoints, keep others
      setSelectedEndpoints((prev) =>
        prev.filter((id) => !endpointIds.includes(id)),
      );
    }
  };

  // Highlight search terms in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span
          key={index}
          className="rounded bg-yellow-200 px-0.5 font-medium dark:bg-yellow-800"
        >
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  const isSearchMode = debouncedSearchQuery.trim();

  // Get currently visible endpoints based on mode
  const currentVisibleEndpoints = useMemo(() => {
    return isSearchMode ? filteredSearchEndpoints : filteredEndpoints;
  }, [isSearchMode, filteredSearchEndpoints, filteredEndpoints]);

  const handleConfirm = () => {
    if (onEndpointsUpdate) {
      onEndpointsUpdate(selectedEndpoints);
    }
    onOpenChange(false);
  };

  const handleOpenEndpointDetails = (path: string, method: string) => {
    setSelectedEndpointForDetails({ path, method });
    setSheetOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[90svh] w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogHeader
            api={api}
            onBackClick={onBackClick}
            onClose={() => onOpenChange(false)}
          />

          <div
            className={cn(
              "flex flex-col gap-2",
              debouncedSearchQuery ? "" : "border-b",
            )}
          >
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onClearSearch={clearSearch}
              searchInputRef={searchInputRef}
            />

            <FolderFilterChips
              searchFolderCounts={searchFolderCounts}
              selectedSearchFolders={selectedSearchFolders}
              onToggleSearchFolder={toggleSearchFolder}
            />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {!isSearchMode ? (
              <>
                <FolderList
                  folders={folders}
                  selectedFolder={selectedFolder}
                  selectedCountByFolder={selectedCountByFolder}
                  onSelectFolder={selectFolder}
                />
                <div className="w-3/4 overflow-y-auto">
                  <EndpointList
                    endpoints={currentVisibleEndpoints}
                    selectedEndpoints={selectedEndpoints}
                    onToggleEndpoint={toggleEndpointSelection}
                    onToggleAllEndpoints={toggleAllEndpoints}
                    title={`${selectedFolder === "root" ? "Root" : selectedFolder ? selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1) : ""} Endpoints`}
                    subtitle="Select endpoints to include in your MCP server"
                    apiId={api.id}
                    onOpenEndpointDetails={handleOpenEndpointDetails}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-hidden">
                <EndpointList
                  endpoints={currentVisibleEndpoints}
                  selectedEndpoints={selectedEndpoints}
                  onToggleEndpoint={toggleEndpointSelection}
                  onToggleAllEndpoints={toggleAllEndpoints}
                  title={`Search Results${selectedEndpoints.length > 0 ? ` (${selectedEndpoints.length} selected)` : ""}`}
                  subtitle={`${currentVisibleEndpoints.length} matching endpoints`}
                  apiId={api.id}
                  isSearchMode={true}
                  searchQuery={debouncedSearchQuery.trim()}
                  highlightText={highlightText}
                  onOpenEndpointDetails={handleOpenEndpointDetails}
                />
              </div>
            )}
          </div>

          <DialogFooter
            selectedCount={selectedEndpoints.length}
            onCancel={() => onOpenChange(false)}
            onConfirm={handleConfirm}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="max-w-none min-w-[100vw] p-0 py-8 sm:min-w-[100vw]"
        >
          <div className="flex-1 overflow-y-auto">
            {selectedEndpointForDetails && (
              <ApiExplorer
                openapiSpec={api.api}
                endpointPath={selectedEndpointForDetails.path}
                endpointMethod={
                  selectedEndpointForDetails.method as Lowercase<OpenAPIV3.HttpMethods>
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
