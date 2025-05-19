import React from "react";
import { SidebarMenuSub, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { EndpointNav } from "@/components/EndpointNav";
import { OpenAPIV3 } from "openapi-types";

interface ApiEndpointListProps {
  apiId: string;
  paths: Record<string, any>;
  isOpen: boolean;
}

export function ApiEndpointList({ apiId, paths, isOpen }: ApiEndpointListProps) {
  if (!isOpen || !paths) return null;

  return (
    <SidebarMenuSub>
      {isOpen && paths && (
        <>
          {Object.entries(paths).flatMap(([path, pathItem]) => {
            if (!pathItem) return [];
            
            const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
            return methods.flatMap(method => {
              const operation = pathItem[method];
              if (!operation) return [];
              
              // Add path and method to the operation object
              const extendedOperation = {
                ...operation,
                'x-path': path,
                'x-method': method
              };
              
              return [
                <EndpointNav
                  key={`${apiId}-${method}-${path}`}
                  apiId={apiId}
                  def={extendedOperation}
                />
              ];
            });
          })}
          {Object.keys(paths).length === 0 && (
            <SidebarMenuSubItem>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                No endpoints available
              </div>
            </SidebarMenuSubItem>
          )}
        </>
      )}
    </SidebarMenuSub>
  );
}
