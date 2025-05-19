import React, { useMemo } from "react";
import { SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { OpenAPIV3 } from "openapi-types";
import { Link, useLocation } from "@tanstack/react-router";

type MethodBadgeProps = {
  method: string;
};

const MethodBadge: React.FC<MethodBadgeProps> = ({ method }) => {
  // Define colors for different HTTP methods
  const getMethodColor = (method: string) => {
    const methodLower = method.toLowerCase();
    switch (methodLower) {
      case 'get':
        return 'bg-blue-100 text-blue-800';
      case 'post':
        return 'bg-green-100 text-green-800';
      case 'put':
        return 'bg-amber-100 text-amber-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'patch':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md mr-2 uppercase ${getMethodColor(method)}`}>
      {method}
    </span>
  );
};

type Props = {
  apiId: string;
  def: OpenAPIV3.OperationObject & {
    'x-path': string;
    'x-method': string;
  };
};

export const EndpointNav: React.FC<Props> = ({ apiId, def }) => {
  // Get the path and method from the operation object
  const path = def['x-path'];
  const method = def['x-method'];
  
  const location = useLocation();
  
  // Check if this endpoint is active using regexp
  const isActive = useMemo(() => {
    const match = location.pathname.match(/\/api\/([^/]+)\/endpoint\/([^?]+)/); 
    const searchParams = new URLSearchParams(location.search);
    const currentMethod = searchParams.get('method');
    
    // Check if the current path and method match this endpoint
    return Boolean(
      match && 
      match[1] === apiId && 
      decodeURIComponent(match[2]) === path && 
      currentMethod === method
    );
  }, [location.pathname, location.search, apiId, path, method]);
  
  // Use operationId if available, otherwise use path
  let displayName = def.operationId || path;
  
  // Remove method prefix from displayName if it starts with the method
  if (method && displayName) {
    const methodLower = method.toLowerCase();
    if (displayName.toLowerCase().startsWith(methodLower)) {
      // Check if there's a dash after the method name
      if (displayName.substring(methodLower.length, methodLower.length + 1) === '-') {
        displayName = displayName.substring(methodLower.length + 1).trim();
      } else if (displayName.length > methodLower.length) {
        // If no dash but there's more content, check if we should still remove the method
        const nextChar = displayName.charAt(methodLower.length);
        if (nextChar === ' ' || nextChar === '_') {
          displayName = displayName.substring(methodLower.length + 1).trim();
        }
      }
    }
  }

  return (
    <SidebarMenuSubItem>
      <Link to="/api/$apiId/endpoint/$endpointId" params={{ apiId, endpointId: path }} search={{ method }}>
        <SidebarMenuSubButton className="text-xs" isActive={isActive}>
          <MethodBadge method={method} />
          <span>{displayName}</span>
        </SidebarMenuSubButton>
      </Link>
    </SidebarMenuSubItem>
  );
};
