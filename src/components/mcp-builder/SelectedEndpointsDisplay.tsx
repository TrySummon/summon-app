import React from "react";
import { MethodBadge } from "@/components/MethodBadge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { McpEndpoint } from "@/helpers/db/mcp-db";

interface SelectedEndpointsDisplayProps {
  selectedEndpoints: McpEndpoint[];
  onRemoveEndpoint: (apiId: string, method: string, path: string) => void;
}

export function SelectedEndpointsDisplay({ 
  selectedEndpoints, 
  onRemoveEndpoint 
}: SelectedEndpointsDisplayProps) {
  // Group endpoints by API
  const endpointsByApi = selectedEndpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.apiId]) {
      acc[endpoint.apiId] = {
        apiName: endpoint.apiName,
        endpoints: []
      };
    }
    
    acc[endpoint.apiId].endpoints.push(endpoint);
    return acc;
  }, {} as Record<string, { apiName: string; endpoints: typeof selectedEndpoints }>);
  
  if (selectedEndpoints.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">No endpoints selected yet.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {Object.entries(endpointsByApi).map(([apiId, { apiName, endpoints }]) => (
        <div key={apiId} className="space-y-1">
          <h3 className="text-sm font-medium">{apiName}</h3>
          <div className="space-y-1 border-l-2 border-muted pl-3">
            {endpoints.map((endpoint) => (
              <div 
                key={`${endpoint.method}-${endpoint.path}`} 
                className="flex items-center justify-between py-1 rounded-sm hover:bg-muted/10"
              >
                <div className="flex items-center gap-2">
                  <MethodBadge method={endpoint.method} size="sm" />
                  <span className="font-mono text-xs">{endpoint.path}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => onRemoveEndpoint(endpoint.apiId, endpoint.method, endpoint.path)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
