import React, { useMemo } from "react";
import { SidebarMenuSub, SidebarMenuSubItem } from "@/components/ui/sidebar";
import { EndpointNav } from "@/components/EndpointNav";
import { ApiEndpointGroup } from "./ApiEndpointGroup";

interface ApiEndpointListProps {
  apiId: string;
  paths: Record<string, any>;
  isOpen: boolean;
}

export function ApiEndpointList({ apiId, paths, isOpen }: ApiEndpointListProps) {
  if (!isOpen || !paths) return null;

  // Group endpoints by their first path segment
  const { rootEndpoints, groupedPaths } = useMemo(() => {
    const rootEndpoints: Array<{path: string; method: string; operation: any}> = [];
    const groupedPaths: Record<string, { count: number; paths: Record<string, any> }> = {};
    
    // First pass: count endpoints per segment and collect paths
    Object.entries(paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;
      
      // Split the path by '/' and get the first segment
      const segments = path.split('/').filter(Boolean);
      
      if (segments.length > 0) {
        const firstSegment = segments[0];
        
        // Initialize or update the group
        if (!groupedPaths[firstSegment]) {
          groupedPaths[firstSegment] = { count: 0, paths: {} };
        }
        
        // Count methods in this path
        const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
        let methodCount = 0;
        
        methods.forEach(method => {
          if (pathItem[method]) {
            methodCount++;
            groupedPaths[firstSegment].count++;
          }
        });
        
        // Add path to the group's paths
        if (methodCount > 0) {
          groupedPaths[firstSegment].paths[path] = pathItem;
        }
      } else {
        // Root paths with no segments
        const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
        methods.forEach(method => {
          const operation = pathItem[method];
          if (!operation) return;
          
          rootEndpoints.push({
            path,
            method,
            operation: {
              ...operation,
              'x-path': path,
              'x-method': method
            }
          });
        });
      }
    });
    
    // Second pass: move single-endpoint groups to root endpoints
    Object.entries(groupedPaths).forEach(([segment, { count, paths: segmentPaths }]) => {
      if (count <= 1) {
        // This group has only one endpoint, move it to root endpoints
        Object.entries(segmentPaths).forEach(([path, pathItem]) => {
          const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
          methods.forEach(method => {
            const operation = pathItem[method];
            if (!operation) return;
            
            rootEndpoints.push({
              path,
              method,
              operation: {
                ...operation,
                'x-path': path,
                'x-method': method
              }
            });
          });
        });
        
        // Remove this segment from groupedPaths
        delete groupedPaths[segment];
      }
    });
    
    // Convert to the format expected by the component
    const finalGroupedPaths: Record<string, boolean> = {};
    Object.keys(groupedPaths).forEach(segment => {
      finalGroupedPaths[segment] = true;
    });
    
    return { rootEndpoints, groupedPaths: finalGroupedPaths };
  }, [paths]);

  return (
    <SidebarMenuSub>
      {isOpen && paths && (
        <>
          {/* Render root-level endpoints that don't belong to any group */}
          {rootEndpoints.map(({ path, method, operation }) => (
            <EndpointNav
              key={`${apiId}-${method}-${path}`}
              apiId={apiId}
              def={operation}
            />
          ))}
          
          {/* Render grouped endpoints */}
          {Object.keys(groupedPaths).map(segment => (
            <ApiEndpointGroup
              key={`group-${segment}`}
              apiId={apiId}
              groupName={segment}
              paths={paths}
              pathPrefix={`/${segment}/`}
            />
          ))}
          
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
