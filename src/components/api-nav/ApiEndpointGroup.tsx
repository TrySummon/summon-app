import React from "react";
import { Folder, ChevronRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { EndpointNav } from "@/components/EndpointNav";
import { OpenAPIV3 } from "openapi-types";

interface ApiEndpointGroupProps {
  apiId: string;
  groupName: string;
  paths: OpenAPIV3.PathsObject;
  pathPrefix: string;
  isOpen?: boolean;
}

interface GroupedEndpoints {
  [key: string]: {
    subgroups: Record<string, OpenAPIV3.PathItemObject>;
    endpoints: Array<{
      path: string;
      method: string;
      operation: OpenAPIV3.OperationObject & {
        "x-path": string;
        "x-method": string;
      };
    }>;
  };
}

export function ApiEndpointGroup({
  apiId,
  groupName,
  paths,
  pathPrefix,
  isOpen = false,
}: ApiEndpointGroupProps) {
  const [open, setOpen] = React.useState(isOpen);

  // Group endpoints by their next path segment
  const groupedEndpoints = React.useMemo(() => {
    const result: GroupedEndpoints = {};

    Object.entries(paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;

      // Skip paths that don't match the prefix pattern
      // Path should either be exactly the prefix or start with prefix followed by /
      if (!path.startsWith(pathPrefix)) return;

      // If path is exactly the prefix, treat it as a direct endpoint
      if (path === pathPrefix) {
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

          // Use a special key for direct endpoints
          if (!result["__direct__"]) {
            result["__direct__"] = {
              subgroups: {},
              endpoints: [],
            };
          }

          result["__direct__"].endpoints.push({
            path,
            method,
            operation: {
              ...operation,
              "x-path": path,
              "x-method": method,
            },
          });
        });
        return;
      }

      // Get the remaining path after the prefix
      const remainingPath = path.slice(pathPrefix.length);

      // Skip if remaining path doesn't start with /
      if (!remainingPath.startsWith("/")) return;

      // Remove the leading slash
      const pathAfterSlash = remainingPath.slice(1);

      // Skip if there's no remaining path after the slash
      if (!pathAfterSlash) return;

      // Split the remaining path by '/'
      const segments = pathAfterSlash.split("/").filter(Boolean);

      if (segments.length === 0) return;

      const firstSegment = segments[0];

      // Initialize the group if it doesn't exist
      if (!result[firstSegment]) {
        result[firstSegment] = {
          subgroups: {},
          endpoints: [],
        };
      }

      // If this is a direct child (no more segments)
      if (segments.length === 1) {
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

          result[firstSegment].endpoints.push({
            path,
            method,
            operation: {
              ...operation,
              "x-path": path,
              "x-method": method,
            },
          });
        });
      } else {
        // Add to the subgroup's paths
        result[firstSegment].subgroups[path] = pathItem;
      }
    });

    return result;
  }, [paths, pathPrefix]);

  // Check if there are any endpoints or subgroups
  const hasContent = Object.keys(groupedEndpoints).length > 0;

  if (!hasContent) return null;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible w-full"
    >
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton className="flex cursor-pointer items-center text-xs select-none">
            <div className="flex items-center">
              <div className="flex items-center">
                {open ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </div>
              <div className="flex w-[26px] justify-end">
                <Folder className="h-3 w-3" />
              </div>
            </div>
            <span>{groupName}</span>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-border mt-1 ml-3 border-l pl-4">
            {Object.entries(groupedEndpoints).map(
              ([segment, { subgroups, endpoints }]) => (
                <React.Fragment key={segment}>
                  {/* Render direct endpoints (for exact path matches) */}
                  {segment === "__direct__" &&
                    endpoints.map(({ path, method, operation }) => (
                      <EndpointNav
                        key={`${apiId}-${method}-${path}`}
                        apiId={apiId}
                        def={operation}
                      />
                    ))}

                  {/* Render subgroups recursively */}
                  {segment !== "__direct__" &&
                    Object.keys(subgroups).length > 0 && (
                      <ApiEndpointGroup
                        apiId={apiId}
                        groupName={segment}
                        paths={paths}
                        pathPrefix={`${pathPrefix}/${segment}`}
                      />
                    )}

                  {/* Render direct endpoints for subgroups */}
                  {segment !== "__direct__" &&
                    endpoints.map(({ path, method, operation }) => (
                      <EndpointNav
                        key={`${apiId}-${method}-${path}`}
                        apiId={apiId}
                        def={operation}
                      />
                    ))}
                </React.Fragment>
              ),
            )}
          </div>
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}
