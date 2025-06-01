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
import { PropertyItem } from './PropertyItem';
import { PrimitiveType } from './PrimitiveType';
import { ReadOnlySchemaDialogProps, SchemaHistoryItem } from '../types';

export const ReadOnlySchemaDialog: React.FC<ReadOnlySchemaDialogProps> = ({
  open,
  onOpenChange,
  name,
  schema: initialSchema,
}) => {
  // Schema navigation history
  const [schemaHistory, setSchemaHistory] = useState<SchemaHistoryItem[]>([
    { schema: initialSchema, name }
  ]);
  
  // Current schema is the last one in the history
  const currentSchema = schemaHistory[schemaHistory.length - 1].schema;
  const currentName = schemaHistory[schemaHistory.length - 1].name;

  // Navigate to a nested schema
  const navigateToSchema = (schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject, name: string) => {
    let resolvedSchema: OpenAPIV3.SchemaObject;
    
    resolvedSchema = schema as OpenAPIV3.SchemaObject;
    
    setSchemaHistory([...schemaHistory, { schema: resolvedSchema, name }]);
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
        setSchemaHistory([{ schema: initialSchema, name }]);
      }, 300);
    }
    onOpenChange(open);
  };

  // Render properties of an object schema
  const renderObjectProperties = () => {
    if (!('properties' in currentSchema) || !currentSchema.properties) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No properties defined</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {Object.entries(currentSchema.properties).map(([propName, propSchema]) => {
          const isRequired = 'required' in currentSchema && 
            Array.isArray(currentSchema.required) && 
            currentSchema.required.includes(propName);
          
          return (
            <PropertyItem
              key={propName}
              propName={propName}
              propSchema={propSchema}
              isRequired={isRequired}
              onNavigate={navigateToSchema}
            />
          );
        })}
      </div>
    );
  };

  // Render array items
  const renderArrayItems = () => {
    if (!('items' in currentSchema) || !currentSchema.items) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No items defined</p>
        </div>
      );
    }

    const itemSchema = currentSchema.items;
    const isObjectItem = ('type' in itemSchema && itemSchema.type === 'object') || 
                        ('properties' in itemSchema && itemSchema.properties);

    return (
      <div className="space-y-4">
        {/* If it's an object with properties, show them directly */}
        {isObjectItem && 'properties' in itemSchema && itemSchema.properties ? (
          <div className="space-y-1">
            {Object.entries(itemSchema.properties).map(([propName, propSchema]) => (
              <PropertyItem
                key={propName}
                propName={propName}
                propSchema={propSchema}
                isRequired={itemSchema.required?.includes(propName) || false}
                onNavigate={navigateToSchema}
              />
            ))}
          </div>
        ) : (
          /* For primitive types, show the type details */
          <PrimitiveType schema={itemSchema as OpenAPIV3.SchemaObject} />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[60vw] h-5/6 sm:max-w-none overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {schemaHistory.length > 1 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={goBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold">{currentName}</DialogTitle>
              {'type' in currentSchema && currentSchema.type && (
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground">
                    {currentSchema.type}
                  </Badge>
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Schema description */}
        {'description' in currentSchema && currentSchema.description && (
          <div className="px-1 pb-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentSchema.description}
            </p>
          </div>
        )}

        {/* Content area with scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {'type' in currentSchema && currentSchema.type === 'object' ? (
            renderObjectProperties()
          ) : 'type' in currentSchema && currentSchema.type === 'array' ? (
            renderArrayItems()
          ) : (
            <div className="py-8">
              <PrimitiveType schema={currentSchema} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
