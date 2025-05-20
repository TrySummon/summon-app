import React from 'react';
import { MethodBadge } from '@/components/MethodBadge';

interface EndpointPathDisplayProps {
  method: string;
  path: string;
}



export const EndpointPathDisplay: React.FC<EndpointPathDisplayProps> = ({ method, path }) => {
  return (
    <div className="p-2 border border-border rounded-lg bg-card flex items-center space-x-3">
      <MethodBadge method={method} size="lg" />
      <span className="font-mono text-md text-foreground">{path}</span>
    </div>
  );
};