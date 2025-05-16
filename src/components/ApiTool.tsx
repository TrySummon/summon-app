import React from "react";
import { SidebarMenuSubItem, SidebarMenuSubButton } from "@/components/ui/sidebar";
import { McpToolDefinition } from "@/helpers/openapi/types";

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
  tool: McpToolDefinition;
};

export const ApiTool: React.FC<ApiToolProps> = ({ tool }) => {
  // Extract method from the tool name if it follows the pattern "METHOD-toolname"
  const methodMatch = tool.name.match(/^(GET|POST|PUT|DELETE|PATCH)-/i);
  
  // If method is in the name, display it as a badge and show the rest of the name
  const displayName = methodMatch 
    ? tool.name.substring(methodMatch[0].length) 
    : tool.name;
  
  // Use either the method from the name or from the tool definition
  const method = methodMatch ? methodMatch[1].toUpperCase() : tool.method.toUpperCase();

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton className="text-xs">
        <MethodBadge method={method} />
        <span>{displayName}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
};
