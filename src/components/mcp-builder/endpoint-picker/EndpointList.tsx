import React from "react";
import { Search, Folder, PanelRightOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { MethodBadge } from "@/components/MethodBadge";
import { cn } from "@/utils/tailwind";

interface Endpoint {
  path: string;
  method: string;
  folder: string;
  summary?: string;
  description?: string;
  operationId?: string;
}

interface EndpointListProps {
  endpoints: Endpoint[];
  selectedEndpoints: string[];
  alreadySelectedEndpoints?: string[];
  onToggleEndpoint: (endpointId: string) => void;
  onToggleAllEndpoints: (checked: boolean) => void;
  title: string;
  subtitle: string;
  apiId?: string;
  onOpenEndpointDetails?: (path: string, method: string) => void;
  isSearchMode?: boolean;
  searchQuery?: string;
  highlightText?: (text: string, query: string) => React.ReactNode;
}

export function EndpointList({
  endpoints,
  selectedEndpoints,
  alreadySelectedEndpoints = [],
  onToggleEndpoint,
  onToggleAllEndpoints,
  title,
  subtitle,
  apiId,
  onOpenEndpointDetails,
  isSearchMode = false,
  searchQuery = "",
  highlightText,
}: EndpointListProps) {
  // Only consider endpoints that are not already selected for the "all selected" calculation
  const availableEndpoints = endpoints.filter(
    (endpoint) =>
      !alreadySelectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`),
  );

  const allSelected =
    availableEndpoints.length > 0 &&
    availableEndpoints.every((endpoint) =>
      selectedEndpoints.includes(`${endpoint.method}-${endpoint.path}`),
    );

  if (endpoints.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
        <Search className="mb-2 h-8 w-8 opacity-50" />
        <p>
          {isSearchMode
            ? `No endpoints match "${searchQuery}"`
            : "No endpoints found"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="bg-muted/5 flex flex-shrink-0 items-center border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onToggleAllEndpoints}
            disabled={availableEndpoints.length === 0}
          />
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="flex-1 overflow-y-auto">
        {endpoints.map((endpoint) => {
          const endpointId = `${endpoint.method}-${endpoint.path}`;
          const isSelected = selectedEndpoints.includes(endpointId);
          const isAlreadySelected =
            alreadySelectedEndpoints.includes(endpointId);

          return (
            <div
              key={endpointId}
              className={cn(
                "border-b px-4 py-3 transition-colors",
                !isAlreadySelected && "hover:bg-muted/5 cursor-pointer",
                isSelected && "bg-green-50 dark:bg-green-900/10",
                isAlreadySelected && "bg-muted/20 opacity-60",
              )}
              onClick={() => !isAlreadySelected && onToggleEndpoint(endpointId)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected || isAlreadySelected}
                  onCheckedChange={() =>
                    !isAlreadySelected && onToggleEndpoint(endpointId)
                  }
                  className="pointer-events-none mt-0.5"
                  disabled={isAlreadySelected}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <MethodBadge method={endpoint.method} size="md" />
                    <span
                      className={cn(
                        "font-mono text-sm",
                        isAlreadySelected && "text-muted-foreground",
                      )}
                    >
                      {isSearchMode && highlightText
                        ? highlightText(endpoint.path, searchQuery)
                        : endpoint.path}
                    </span>
                    {isSearchMode && (
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Folder className="h-3 w-3" />
                        <span>
                          {endpoint.folder === "root"
                            ? "Root"
                            : endpoint.folder}
                        </span>
                      </div>
                    )}
                    {isAlreadySelected && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        Already added
                      </span>
                    )}
                    {apiId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto h-6 w-6 p-0 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEndpointDetails?.(
                            endpoint.path,
                            endpoint.method,
                          );
                        }}
                      >
                        <PanelRightOpen className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {(endpoint.summary || endpoint.description) && (
                    <div
                      className={cn(
                        "text-sm",
                        isAlreadySelected
                          ? "text-muted-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {isSearchMode && highlightText ? (
                        <>
                          {endpoint.summary &&
                            highlightText(endpoint.summary, searchQuery)}
                          {endpoint.description &&
                            !endpoint.summary &&
                            highlightText(
                              endpoint.description.slice(0, 100) +
                                (endpoint.description.length > 100
                                  ? "..."
                                  : ""),
                              searchQuery,
                            )}
                        </>
                      ) : (
                        endpoint.summary ||
                        (endpoint.description &&
                          endpoint.description.slice(0, 100) +
                            (endpoint.description.length > 100 ? "..." : ""))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
