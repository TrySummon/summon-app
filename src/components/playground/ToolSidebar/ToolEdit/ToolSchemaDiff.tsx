import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/tailwind';
import type { Tool } from '@modelcontextprotocol/sdk/types';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { ChevronRight, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';

interface ToolSchemaDiffProps {
  originalTool: Tool;
  modifiedName: string;
  modifiedDescription: string;
  modifiedSchema: JSONSchema7;
}

export const ToolSchemaDiff: React.FC<ToolSchemaDiffProps> = ({
  originalTool,
  modifiedName,
  modifiedDescription,
  modifiedSchema,
}) => {
  const nameChanged = modifiedName !== originalTool.name;
  const descriptionChanged = modifiedDescription !== (originalTool.description || '');
  const schemaChanged = JSON.stringify(modifiedSchema) !== JSON.stringify(originalTool.inputSchema);

  return (
    <div className="space-y-6 h-full overflow-y-auto pr-2">
      {/* Tool Name Diff */}
      {nameChanged && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Tool Name</h3>
          <div className="space-y-3">
            <div className="p-3 border border-red-500/30 bg-red-500/10 dark:bg-red-500/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">
                  Original
                </Badge>
              </div>
              <code className="text-sm font-mono text-red-700 dark:text-red-400">
                {originalTool.name}
              </code>
            </div>
            <div className="p-3 border border-green-500/30 bg-green-500/10 dark:bg-green-500/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
                  Modified
                </Badge>
              </div>
              <code className="text-sm font-mono text-green-700 dark:text-green-400">
                {modifiedName}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Tool Description Diff */}
      {descriptionChanged && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          <div className="space-y-3">
            <div className="p-3 border border-red-500/30 bg-red-500/10 dark:bg-red-500/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">
                  Original
                </Badge>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400">
                {originalTool.description || <em className="text-red-600 dark:text-red-500">No description</em>}
              </p>
            </div>
            <div className="p-3 border border-green-500/30 bg-green-500/10 dark:bg-green-500/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
                  Modified
                </Badge>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                {modifiedDescription || <em className="text-green-600 dark:text-green-500">No description</em>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Schema Diff */}
      {schemaChanged && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Input Schema</h3>
          <SchemaDiff
            originalSchema={originalTool.inputSchema as JSONSchema7}
            modifiedSchema={modifiedSchema}
          />
        </div>
      )}

      {!nameChanged && !descriptionChanged && !schemaChanged && (
        <div className="text-center py-8 text-muted-foreground">
          No changes to display
        </div>
      )}
    </div>
  );
};

interface SchemaDiffProps {
  originalSchema: JSONSchema7;
  modifiedSchema: JSONSchema7;
}

const SchemaDiff: React.FC<SchemaDiffProps> = ({
  originalSchema,
  modifiedSchema,
}) => {
  const changes = findSchemaChanges(originalSchema, modifiedSchema);

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <PropertyDiff key={`${change.path.join('.')}-${index}`} change={change} />
      ))}
      
      {changes.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No property changes
        </div>
      )}
    </div>
  );
};

interface SchemaChange {
  path: string[];
  type: 'added' | 'removed' | 'modified' | 'disabled' | 'enabled' | 'description_changed' | 'name_changed' | 'required_changed';
  original?: any;
  modified?: any;
  details?: string;
}

function findSchemaChanges(original: JSONSchema7, modified: JSONSchema7, path: string[] = []): SchemaChange[] {
  const changes: SchemaChange[] = [];
  
  const originalProps = original.properties || {};
  const modifiedProps = modified.properties || {};
  const originalRequired = original.required || [];
  const modifiedRequired = modified.required || [];

  // Find all property names
  const allPropertyNames = new Set([
    ...Object.keys(originalProps),
    ...Object.keys(modifiedProps)
  ]);

  // Track potential renames by looking for properties with x-original-name
  const renames = new Map<string, string>(); // originalName -> newName
  const processedProps = new Set<string>();

  // First pass: identify renames
  Object.keys(modifiedProps).forEach(modifiedPropName => {
    const modifiedProp = modifiedProps[modifiedPropName] as JSONSchema7 & { 'x-original-name'?: string; 'x-ui-disabled'?: boolean };
    const originalName = modifiedProp?.['x-original-name'];
    
    if (originalName && originalName !== modifiedPropName && originalProps[originalName]) {
      // This is a renamed property
      renames.set(originalName, modifiedPropName);
      processedProps.add(originalName);
      processedProps.add(modifiedPropName);
      
      const currentPath = [...path, modifiedPropName];
      const originalProp = originalProps[originalName] as JSONSchema7 & { 'x-original-name'?: string; 'x-ui-disabled'?: boolean };
      
      // Add rename change
      changes.push({
        path: currentPath,
        type: 'name_changed',
        original: originalProp,
        modified: modifiedProp,
        details: `Renamed from "${originalName}" to "${modifiedPropName}"`
      });
      
      // Check for other changes on the renamed property
      const originalReq = originalRequired.includes(originalName);
      const modifiedReq = modifiedRequired.includes(modifiedPropName);
      const originalDisabled = (originalProp as JSONSchema7 & { 'x-ui-disabled'?: boolean })?.['x-ui-disabled'] || false;
      const modifiedDisabled = (modifiedProp as JSONSchema7 & { 'x-ui-disabled'?: boolean })?.['x-ui-disabled'] || false;
      
      // Check for disabled/enabled changes
      if (originalDisabled !== modifiedDisabled) {
        changes.push({
          path: currentPath,
          type: modifiedDisabled ? 'disabled' : 'enabled',
          original: originalProp,
          modified: modifiedProp,
          details: modifiedDisabled ? 'Property disabled' : 'Property enabled'
        });
      }
      
      // Check for required status changes
      if (originalReq !== modifiedReq) {
        changes.push({
          path: currentPath,
          type: 'required_changed',
          original: originalProp,
          modified: modifiedProp,
          details: modifiedReq ? 'Made required' : 'Made optional'
        });
      }
      
      // Check for description changes
      const originalDesc = (originalProp as JSONSchema7 & { description?: string })?.description || '';
      const modifiedDesc = (modifiedProp as JSONSchema7 & { description?: string })?.description || '';
      if (originalDesc !== modifiedDesc) {
        changes.push({
          path: currentPath,
          type: 'description_changed',
          original: originalProp,
          modified: modifiedProp,
          details: 'Description changed'
        });
      }
      
      // Check for deep schema changes (nested objects)
      if ((originalProp as JSONSchema7).type === 'object' && (modifiedProp as JSONSchema7).type === 'object') {
        const nestedChanges = findSchemaChanges(originalProp as JSONSchema7, modifiedProp as JSONSchema7, currentPath);
        changes.push(...nestedChanges);
      }
      
      // Check for other structural changes (type, format, etc.)
      const structuralChanges = findStructuralChanges(originalProp as JSONSchema7, modifiedProp as JSONSchema7, currentPath);
      changes.push(...structuralChanges);
    }
  });

  // Second pass: handle non-renamed properties
  allPropertyNames.forEach(propName => {
    if (processedProps.has(propName)) {
      return; // Skip already processed renames
    }
    
    const currentPath = [...path, propName];
    const originalProp = originalProps[propName] as JSONSchema7 & { 'x-original-name'?: string; 'x-ui-disabled'?: boolean };
    const modifiedProp = modifiedProps[propName] as JSONSchema7 & { 'x-original-name'?: string; 'x-ui-disabled'?: boolean };
    
    const originalRequired = original.required?.includes(propName) || false;
    const modifiedRequired = modified.required?.includes(propName) || false;
    
    const originalDisabled = (originalProp as JSONSchema7 & { 'x-ui-disabled'?: boolean })?.['x-ui-disabled'] || false;
    const modifiedDisabled = (modifiedProp as JSONSchema7 & { 'x-ui-disabled'?: boolean })?.['x-ui-disabled'] || false;

    // Property added
    if (!originalProp && modifiedProp) {
      changes.push({
        path: currentPath,
        type: 'added',
        modified: modifiedProp,
        details: `Added ${getPropertyTypeDescription(modifiedProp)}${modifiedRequired ? ' (required)' : ''}`
      });
    }
    // Property removed
    else if (originalProp && !modifiedProp) {
      changes.push({
        path: currentPath,
        type: 'removed',
        original: originalProp,
        details: `Removed ${getPropertyTypeDescription(originalProp)}${originalRequired ? ' (was required)' : ''}`
      });
    }
    // Property exists in both - check for changes
    else if (originalProp && modifiedProp) {
      // Check for disabled/enabled changes
      if (originalDisabled !== modifiedDisabled) {
        changes.push({
          path: currentPath,
          type: modifiedDisabled ? 'disabled' : 'enabled',
          original: originalProp,
          modified: modifiedProp,
          details: modifiedDisabled ? 'Property disabled' : 'Property enabled'
        });
      }
      
      // Check for required status changes
      if (originalRequired !== modifiedRequired) {
        changes.push({
          path: currentPath,
          type: 'required_changed',
          original: originalProp,
          modified: modifiedProp,
          details: modifiedRequired ? 'Made required' : 'Made optional'
        });
      }
      
      // Check for description changes
      const originalDesc = (originalProp as JSONSchema7 & { description?: string })?.description || '';
      const modifiedDesc = (modifiedProp as JSONSchema7 & { description?: string })?.description || '';
      if (originalDesc !== modifiedDesc) {
        changes.push({
          path: currentPath,
          type: 'description_changed',
          original: originalProp,
          modified: modifiedProp,
          details: 'Description changed'
        });
      }
      
      // Check for deep schema changes (nested objects)
      if ((originalProp as JSONSchema7).type === 'object' && (modifiedProp as JSONSchema7).type === 'object') {
        const nestedChanges = findSchemaChanges(originalProp as JSONSchema7, modifiedProp as JSONSchema7, currentPath);
        changes.push(...nestedChanges);
      }
      
      // Check for other structural changes (type, format, etc.)
      const structuralChanges = findStructuralChanges(originalProp as JSONSchema7, modifiedProp as JSONSchema7, currentPath);
      changes.push(...structuralChanges);
    }
  });

  return changes;
}

function findStructuralChanges(original: JSONSchema7, modified: JSONSchema7, path: string[]): SchemaChange[] {
  const changes: SchemaChange[] = [];
  
  // Check type changes
  const originalType = Array.isArray(original.type) ? original.type.join(' | ') : original.type;
  const modifiedType = Array.isArray(modified.type) ? modified.type.join(' | ') : modified.type;
  
  if (originalType !== modifiedType) {
    changes.push({
      path,
      type: 'modified',
      original,
      modified,
      details: `Type changed from ${originalType || 'unknown'} to ${modifiedType || 'unknown'}`
    });
  }
  
  // Check format changes
  if (original.format !== modified.format) {
    changes.push({
      path,
      type: 'modified',
      original,
      modified,
      details: `Format changed from ${original.format || 'none'} to ${modified.format || 'none'}`
    });
  }
  
  // Check enum changes
  if (JSON.stringify(original.enum) !== JSON.stringify(modified.enum)) {
    changes.push({
      path,
      type: 'modified',
      original,
      modified,
      details: 'Enum values changed'
    });
  }
  
  return changes;
}

function getPropertyTypeDescription(prop: JSONSchema7): string {
  if (prop.type) {
    if (Array.isArray(prop.type)) {
      return prop.type.join(' | ');
    }
    if (prop.type === 'array' && prop.items) {
      const itemType = typeof prop.items === 'object' && !Array.isArray(prop.items) ? prop.items.type : 'unknown';
      return `array of ${Array.isArray(itemType) ? itemType.join(' | ') : itemType || 'unknown'}`;
    }
    return prop.type;
  }
  return 'property';
}

interface PropertyDiffProps {
  change: SchemaChange;
}

const PropertyDiff: React.FC<PropertyDiffProps> = ({ change }) => {
  const getChangeIcon = () => {
    switch (change.type) {
      case 'added': return <Plus className="h-3 w-3" />;
      case 'removed': return <Trash2 className="h-3 w-3" />;
      case 'disabled': return <EyeOff className="h-3 w-3" />;
      case 'enabled': return <Eye className="h-3 w-3" />;
      case 'name_changed': return <Pencil className="h-3 w-3" />;
      default: return <Pencil className="h-3 w-3" />;
    }
  };

  const getChangeColors = () => {
    switch (change.type) {
      case 'added':
        return {
          border: 'border-green-500/30',
          bg: 'bg-green-500/10 dark:bg-green-500/5',
          text: 'text-green-700 dark:text-green-400',
          badge: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
        };
      case 'removed':
        return {
          border: 'border-red-500/30',
          bg: 'bg-red-500/10 dark:bg-red-500/5',
          text: 'text-red-700 dark:text-red-400',
          badge: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
        };
      case 'disabled':
        return {
          border: 'border-orange-500/30',
          bg: 'bg-orange-500/10 dark:bg-orange-500/5',
          text: 'text-orange-700 dark:text-orange-400',
          badge: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'
        };
      case 'enabled':
        return {
          border: 'border-blue-500/30',
          bg: 'bg-blue-500/10 dark:bg-blue-500/5',
          text: 'text-blue-700 dark:text-blue-400',
          badge: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
        };
      case 'name_changed':
        return {
          border: 'border-purple-500/30',
          bg: 'bg-purple-500/10 dark:bg-purple-500/5',
          text: 'text-purple-700 dark:text-purple-400',
          badge: 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600'
        };
      default:
        return {
          border: 'border-yellow-500/30',
          bg: 'bg-yellow-500/10 dark:bg-yellow-500/5',
          text: 'text-yellow-700 dark:text-yellow-400',
          badge: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600'
        };
    }
  };

  const colors = getChangeColors();
  const propertyPath = change.path.join('.');

  return (
    <div className={cn(
      "p-3 border rounded-lg transition-colors",
      colors.border,
      colors.bg
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Badge className={cn("text-xs text-white capitalize", colors.badge)}>
          <span className="flex items-center gap-1">
            {getChangeIcon()}
            {change.type.replace('_', ' ')}
          </span>
        </Badge>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {change.path.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3" />}
              <code className={cn("font-mono", colors.text)}>
                {segment}
              </code>
            </span>
          ))}
        </div>
      </div>

      <div className={cn("text-sm", colors.text)}>
        {change.details}
      </div>

      {/* Show before/after for description changes */}
      {change.type === 'description_changed' && change.original && change.modified && (
        <div className="mt-3 space-y-2">
          <div className="text-xs">
            <span className="font-medium text-red-700 dark:text-red-400">Before:</span>
            <span className="ml-2 text-red-600 dark:text-red-500">
              {(change.original as JSONSchema7 & { description?: string })?.description || <em>No description</em>}
            </span>
          </div>
          <div className="text-xs">
            <span className="font-medium text-green-700 dark:text-green-400">After:</span>
            <span className="ml-2 text-green-600 dark:text-green-500">
              {(change.modified as JSONSchema7 & { description?: string })?.description || <em>No description</em>}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
