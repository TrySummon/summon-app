// components/api-explorer/ParameterItem.tsx
import React, { useState } from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Markdown } from '../Markdown';
import { SchemaDialog } from './SchemaDialog';

interface ParameterItemProps {
  name: string;
  schema: OpenAPIV3.SchemaObject;
  description?: string;
  required?: boolean;
  openapiSpec?: OpenAPIV3.Document;
}

export const ParameterItem: React.FC<ParameterItemProps> = ({ name, schema, description, required, openapiSpec }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const isObject = schema.type === 'object' || (schema.properties && Object.keys(schema.properties).length > 0);
  const isArray = schema.type === 'array' && schema.items;
  const hasComplexItems = isArray && (
    ('type' in schema.items && (schema.items as OpenAPIV3.SchemaObject).type === 'object') ||
    ('$ref' in schema.items)
  );
  
  const canViewSchema = (isObject || hasComplexItems) && openapiSpec;
  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-mono text-xs font-semibold text-foreground">{name}</span>
        {schema.type && (
          <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
            {schema.type}
            {isArray && schema.items && 'type' in schema.items && 
              `<${(schema.items as OpenAPIV3.SchemaObject).type}>`}
          </Badge>
        )}
        
        {canViewSchema && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            View Schema
          </Button>
        )}
        {required && (
          <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
            required
          </Badge>
        )}
      </div>

      {schema.default !== undefined && (
        <div className="mb-2">
          <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
            default: {JSON.stringify(schema.default)}
          </Badge>
        </div>
      )}
      
      {description && (
        <Markdown className="text-sm">{description}</Markdown>
      )}

      {schema.enum && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Possible values: </span>
          {schema.enum.map((val, idx) => (
            <code key={idx} className="font-mono bg-muted p-0.5 rounded-sm mx-0.5">
              {JSON.stringify(val)}
            </code>
          ))}
        </div>
      )}
      
      {/* Schema Dialog */}
      {canViewSchema && openapiSpec && (
        <SchemaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schema={schema}
          title={`${name} Schema`}
          openapiSpec={openapiSpec}
        />
      )}
    </div>
  );
};