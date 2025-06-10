import React from "react";
import { MethodBadge } from "@/components/MethodBadge";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { McpEndpoint } from "@/lib/db/mcp-db";

interface SelectedEndpointsDisplayProps {
  selectedEndpoints: McpEndpoint[];
  onRemoveEndpoint: (apiId: string, method: string, path: string) => void;
  onClearApiGroup?: (apiId: string) => void;
}

export function SelectedEndpointsDisplay({
  selectedEndpoints,
  onRemoveEndpoint,
  onClearApiGroup,
}: SelectedEndpointsDisplayProps) {
  // Group endpoints by API
  const endpointsByApi = selectedEndpoints.reduce(
    (acc, endpoint) => {
      if (!acc[endpoint.apiId]) {
        acc[endpoint.apiId] = {
          apiName: endpoint.apiName,
          endpoints: [],
        };
      }

      acc[endpoint.apiId].endpoints.push(endpoint);
      return acc;
    },
    {} as Record<
      string,
      { apiName: string; endpoints: typeof selectedEndpoints }
    >,
  );

  if (selectedEndpoints.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-muted-foreground text-xs">
          No endpoints selected yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(endpointsByApi).map(([apiId, { apiName, endpoints }]) => {
        const displayEndpoints = endpoints.slice(0, 20);
        const remainingCount = endpoints.length - 20;

        return (
          <div key={apiId} className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{apiName}</h3>
              {onClearApiGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-6 px-2 text-xs"
                  onClick={() => onClearApiGroup(apiId)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="border-muted space-y-1 border-l-2 pl-3">
              {displayEndpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="hover:bg-muted/10 flex items-center justify-between rounded-sm py-1"
                >
                  <div className="flex items-center gap-2">
                    <MethodBadge method={endpoint.method} size="sm" />
                    <span className="font-mono text-xs">{endpoint.path}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() =>
                      onRemoveEndpoint(
                        endpoint.apiId,
                        endpoint.method,
                        endpoint.path,
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="text-muted-foreground py-1 text-xs italic">
                  and {remainingCount} more endpoint
                  {remainingCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
