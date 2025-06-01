import React from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/tailwind';
import { PropertyEdit } from '../types';

interface DiffViewProps {
  originalSchema: OpenAPIV3.SchemaObject;
  modifiedSchema: OpenAPIV3.SchemaObject;
  editingProperties: Record<string, PropertyEdit>;
}

export const DiffView: React.FC<DiffViewProps> = ({
  originalSchema,
  modifiedSchema,
  editingProperties,
}) => {
  const originalProps = originalSchema.properties || {};
  const modifiedProps = modifiedSchema.properties || {};
  
  // Get all property names from both schemas and editing properties
  const allPropNames = new Set([
    ...Object.keys(originalProps), 
    ...Object.keys(modifiedProps),
    ...Object.keys(editingProperties)
  ]);
  
  const changes = Array.from(allPropNames).map(propName => {
    const originalProp = originalProps[propName];
    const modifiedProp = modifiedProps[propName];
    const wasRequired = originalSchema.required?.includes(propName) || false;
    const isRequired = modifiedSchema.required?.includes(propName) || false;
    
    // Check if this property is disabled in our editing state
    const isDisabled = editingProperties[propName]?.isDisabled || false;
    
    const isAdded = !originalProp && modifiedProp;
    const isRemoved = originalProp && (!modifiedProp || isDisabled);
    const isModified = originalProp && modifiedProp && (
      JSON.stringify(originalProp) !== JSON.stringify(modifiedProp) ||
      wasRequired !== isRequired
    );
    
    return {
      propName,
      originalProp,
      modifiedProp,
      wasRequired,
      isRequired,
      isDisabled,
      isAdded,
      isRemoved,
      isModified,
      hasChanges: isAdded || isRemoved || isModified
    };
  }).filter(change => change.hasChanges);
  
  if (changes.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No changes detected</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {changes.map(({ propName, originalProp, modifiedProp, wasRequired, isRequired, isAdded, isRemoved, isModified }) => (
        <div key={propName} className={cn(
          "border border-border rounded-lg p-4",
          isAdded && "border-l-4 border-l-green-500 bg-green-50/30",
          isRemoved && "border-l-4 border-l-red-500 bg-red-50/30",
          isModified && "border-l-4 border-l-blue-500 bg-blue-50/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-foreground">{propName}</span>
              <Badge variant="outline" className={cn(
                "text-xs font-mono",
                isAdded && "border-green-500/50 bg-green-500/10 text-green-600",
                isRemoved && "border-red-500/50 bg-red-500/10 text-red-600",
                isModified && "border-blue-500/50 bg-blue-500/10 text-blue-600"
              )}>
                {isAdded ? 'added' : isRemoved ? 'removed' : 'modified'}
              </Badge>
            </div>
          </div>
          
          {isRemoved ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground line-through">
                {('description' in originalProp && originalProp.description) || 'No description'}
              </div>
              {wasRequired && (
                <Badge variant="outline" className="text-xs font-mono border-red-500/50 bg-red-500/10 text-red-500 line-through">
                  required
                </Badge>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isModified && originalProp && (
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">Original:</div>
                  <div className="text-sm text-red-600/70 line-through pl-2 border-l-2 border-red-200">
                    {('description' in originalProp && originalProp.description) || 'No description'}
                  </div>
                  {wasRequired && (
                    <Badge variant="outline" className="text-xs font-mono border-red-500/50 bg-red-500/10 text-red-500 line-through ml-2">
                      required
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="space-y-1">
                {isModified && <div className="text-xs text-muted-foreground font-medium">Updated:</div>}
                <div className={cn(
                  "text-sm",
                  isModified ? "text-green-600 pl-2 border-l-2 border-green-200" : "text-foreground"
                )}>
                  {('description' in modifiedProp && modifiedProp.description) || 'No description'}
                </div>
                {isRequired && (
                  <Badge variant="outline" className={cn(
                    "text-xs font-mono border-red-500/50 bg-red-500/10 text-red-500",
                    isModified && "ml-2"
                  )}>
                    required
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
