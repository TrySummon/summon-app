import React, { useState } from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from 'lucide-react';
import { resolveRef } from './utils';

interface SchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: OpenAPIV3.SchemaObject;
  title?: string;
  openapiSpec?: OpenAPIV3.Document;
}

interface SchemaHistoryItem {
  schema: OpenAPIV3.SchemaObject;
  title: string;
}

export const SchemaDialog: React.FC<SchemaDialogProps> = ({
  open,
  onOpenChange,
  schema: initialSchema,
  title: initialTitle = 'Schema Details',
  openapiSpec
}) => {
  // Schema navigation history
  const [schemaHistory, setSchemaHistory] = useState<SchemaHistoryItem[]>([
    { schema: initialSchema, title: initialTitle }
  ]);
  
  // Current schema is the last one in the history
  const currentSchema = schemaHistory[schemaHistory.length - 1].schema;
  const currentTitle = schemaHistory[schemaHistory.length - 1].title;

  // Navigate to a nested schema
  const navigateToSchema = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, title: string) => {
    let resolvedSchema: OpenAPIV3.SchemaObject;
    
    if ('$ref' in schema && typeof schema.$ref === 'string' && openapiSpec) {
      const resolved = resolveRef<OpenAPIV3.SchemaObject>(schema.$ref, openapiSpec);
      if (resolved) {
        resolvedSchema = resolved;
        // Extract type name from reference for better title
        const parts = schema.$ref.split('/');
        title = parts[parts.length - 1];
      } else {
        resolvedSchema = { type: 'object', description: `Reference to ${schema.$ref}` };
      }
    } else {
      resolvedSchema = schema as OpenAPIV3.SchemaObject;
    }
    
    setSchemaHistory([...schemaHistory, { schema: resolvedSchema, title }]);
  };

  // Go back to previous schema
  const goBack = () => {
    if (schemaHistory.length > 1) {
      setSchemaHistory(schemaHistory.slice(0, -1));
    }
  };

  // Reset history when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Small delay to avoid visual glitches during the closing animation
      setTimeout(() => {
        setSchemaHistory([{ schema: initialSchema, title: initialTitle }]);
      }, 300);
    }
    onOpenChange(open);
  };

  // Render properties of an object schema
  const renderObjectProperties = () => {
    if (!('properties' in currentSchema) || !currentSchema.properties) {
      return <p className="text-sm text-muted-foreground">No properties defined</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(currentSchema.properties).map(([propName, propSchema]) => {
          const isRequired = 'required' in currentSchema && 
            Array.isArray(currentSchema.required) && 
            currentSchema.required.includes(propName);
          
          const isObject = ('type' in propSchema && propSchema.type === 'object') || 
                          ('$ref' in propSchema);
          
          const isArray = 'type' in propSchema && propSchema.type === 'array';
          const hasArrayItemsRef = isArray && 
                                  'items' in propSchema && 
                                  propSchema.items && 
                                  ('$ref' in propSchema.items || 
                                  ('type' in propSchema.items && propSchema.items.type === 'object'));

          return (
            <div key={propName} className="border-b border-border pb-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-sm font-semibold">{propName}</span>
                
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
                
                {/* Navigate button for objects */}
                {isObject && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => navigateToSchema(propSchema, propName)}
                  >
                    View Schema
                  </Button>
                )}
                
                {/* Navigate button for arrays with object items */}
                {hasArrayItemsRef && 'items' in propSchema && propSchema.items && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => navigateToSchema(propSchema.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, `${propName} Items`)}
                  >
                    View Items
                  </Button>
                )}
              </div>
              
              {/* Description */}
              {'description' in propSchema && propSchema.description && (
                <p className="text-sm text-muted-foreground mt-1">{propSchema.description}</p>
              )}
              
              {/* Default value */}
              {'default' in propSchema && propSchema.default !== undefined && (
                <div className="mt-1">
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
        })}
      </div>
    );
  };

  // Render array items
  const renderArrayItems = () => {
    if (!('items' in currentSchema) || !currentSchema.items) {
      return <p className="text-sm text-muted-foreground">No items defined</p>;
    }

    const itemSchema = currentSchema.items;
    const isObject = ('type' in itemSchema && itemSchema.type === 'object') || 
                     ('$ref' in itemSchema);

    return (
      <div className="space-y-4">
        <div className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold">Array Items</span>
            
            {/* Type badge */}
            {'type' in itemSchema && itemSchema.type && (
              <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                {itemSchema.type}
              </Badge>
            )}
            
            {/* Navigate button for objects */}
            {isObject && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto h-6 px-2 text-xs"
                onClick={() => navigateToSchema(itemSchema, 'Array Item')}
              >
                View Schema
              </Button>
            )}
          </div>
          
          {/* Description */}
          {'description' in itemSchema && itemSchema.description && (
            <p className="text-sm text-muted-foreground mt-1">{itemSchema.description}</p>
          )}
        </div>
      </div>
    );
  };

  // Render primitive type
  const renderPrimitive = () => {
    return (
      <div className="space-y-4">
        <div className="pb-3">
          {/* Description */}
          {'description' in currentSchema && currentSchema.description && (
            <p className="text-sm text-muted-foreground">{currentSchema.description}</p>
          )}
          
          {/* Format */}
          {'format' in currentSchema && currentSchema.format && (
            <div className="mt-2">
              <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                format: {currentSchema.format}
              </Badge>
            </div>
          )}
          
          {/* Default value */}
          {'default' in currentSchema && currentSchema.default !== undefined && (
            <div className="mt-2">
              <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                default: {JSON.stringify(currentSchema.default)}
              </Badge>
            </div>
          )}
          
          {/* Enum values */}
          {'enum' in currentSchema && currentSchema.enum && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Possible values: </span>
              {currentSchema.enum.map((val, idx) => (
                <code key={idx} className="font-mono bg-muted p-0.5 rounded-sm mx-0.5">
                  {JSON.stringify(val)}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center">
          {schemaHistory.length > 1 && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-8 w-8" 
              onClick={goBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <DialogTitle className="text-xl">{currentTitle}</DialogTitle>
            {'type' in currentSchema && currentSchema.type && (
              <DialogDescription>
                Type: <Badge variant="outline" className="font-mono ml-1">{currentSchema.type}</Badge>
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          {'type' in currentSchema ? (
            currentSchema.type === 'object' ? (
              renderObjectProperties()
            ) : currentSchema.type === 'array' ? (
              renderArrayItems()
            ) : (
              renderPrimitive()
            )
          ) : (
            <p className="text-sm text-muted-foreground">Schema details not available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
