import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface PropertyItemProps {
  propName: string;
  propSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  isRequired: boolean;
  onNavigate: (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, title: string) => void;
}

export const PropertyItem: React.FC<PropertyItemProps> = ({
  propName,
  propSchema,
  isRequired,
  onNavigate,
}) => {
  const isObject = ('type' in propSchema && propSchema.type === 'object') || 
                  ('$ref' in propSchema);
  
  const isArray = 'type' in propSchema && propSchema.type === 'array';
  const hasArrayItemsRef = isArray && 
                          'items' in propSchema && 
                          propSchema.items && 
                          ('$ref' in propSchema.items || 
                          ('type' in propSchema.items && propSchema.items.type === 'object'));

  const canNavigate = isObject || hasArrayItemsRef;

  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
          <span className="font-mono text-sm font-semibold text-foreground">{propName}</span>
          
          {/* Type badge */}
          {'type' in propSchema && propSchema.type && (
            <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
              {propSchema.type}
              {isArray && 'items' in propSchema && propSchema.items && 'type' in propSchema.items && 
                `<${propSchema.items.type}>`}
            </Badge>
          )}
          
          {/* Required badge */}
          {isRequired && (
            <Badge variant="outline" className="font-mono text-xs border-red-500/50 bg-red-500/10 text-red-500">
              required
            </Badge>
          )}
        </div>
        
        {/* Navigate button for objects */}
        {canNavigate && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs ml-2 flex-shrink-0"
            onClick={() => onNavigate(propSchema, propName)}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Description */}
      {'description' in propSchema && propSchema.description && (
        <div className="mt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {propSchema.description}
          </p>
        </div>
      )}
      
      {/* Default value */}
      {'default' in propSchema && propSchema.default !== undefined && (
        <div className="mt-2">
          <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
            default: {JSON.stringify(propSchema.default)}
          </Badge>
        </div>
      )}
      
      {/* Enum values */}
      {'enum' in propSchema && propSchema.enum && (
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold">Possible values: </span>
          {propSchema.enum.map((val, idx) => (
            <code key={idx} className="font-mono bg-muted p-0.5 rounded-sm mx-0.5">
              {JSON.stringify(val)}
            </code>
          ))}
        </div>
      )}
    </div>
  );
};
