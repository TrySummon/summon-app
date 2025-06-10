import React from "react";
import { MethodBadge } from "@/components/MethodBadge";

interface EndpointPathDisplayProps {
  method: string;
  path: string;
}

export const EndpointPathDisplay: React.FC<EndpointPathDisplayProps> = ({
  method,
  path,
}) => {
  return (
    <div className="border-border bg-card flex items-center space-x-3 rounded-lg border p-1">
      <MethodBadge method={method} size="lg" />
      <span className="text-foreground font-mono text-xs">{path}</span>
    </div>
  );
};
