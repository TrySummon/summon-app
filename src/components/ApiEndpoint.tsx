import React from "react";
import { SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { OpenAPIV3 } from "openapi-types";

// Extended OpenAPI operation type with custom properties
interface ExtendedOperation extends OpenAPIV3.OperationObject {
  'x-path'?: string;
  'x-method'?: string;
}

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

type ApiToolProps = {
  def: OpenAPIV3.OperationObject & {
    'x-path'?: string;
    'x-method'?: string;
  };
};

export const ApiEndpoint: React.FC<ApiToolProps> = ({ def }) => {
  // Get the path and method from the operation object
  const path = def['x-path'] || '';
  const method = def['x-method'] ? def['x-method'].toUpperCase() : '';
  
  // Use operationId if available, otherwise use path
  const displayName = def.operationId || path;

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton className="text-xs">
        <MethodBadge method={method} />
        <span>{displayName}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
};
