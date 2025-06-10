import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";

export interface MethodBadgeProps {
  method: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const MethodBadge: React.FC<MethodBadgeProps> = ({
  method,
  size = "md",
  className,
}) => {
  // Define colors for different HTTP methods
  const getMethodColor = (method: string) => {
    const methodLower = method.toLowerCase();
    switch (methodLower) {
      case "get":
        return "bg-blue-100 text-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-blue-100";
      case "post":
        return "bg-green-100 text-green-800 dark:bg-green-600 dark:hover:bg-green-700 dark:text-green-100";
      case "put":
        return "bg-amber-100 text-amber-800 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:text-yellow-100";
      case "delete":
        return "bg-red-100 text-red-800 dark:bg-red-600 dark:hover:bg-red-700 dark:text-red-100";
      case "patch":
        return "bg-purple-100 text-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700 dark:text-gray-100";
    }
  };

  // Size-based styling
  const sizeStyles = {
    sm: "text-[10px] p-0 !bg-transparent",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  // Use Badge component with conditional styling
  return (
    <Badge
      className={cn(
        getMethodColor(method),
        sizeStyles[size],
        "rounded-md font-medium uppercase",
        className,
      )}
    >
      {method}
    </Badge>
  );
};
