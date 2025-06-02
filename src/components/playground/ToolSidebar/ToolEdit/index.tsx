import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Pencil, RotateCcw } from 'lucide-react';
import type { Tool } from '@modelcontextprotocol/sdk/types';
import type { JSONSchema7 } from 'json-schema';
import { ToolSchemaDiff } from './ToolSchemaDiff';
import { cn } from '@/utils/tailwind';
import { ModifiedTool } from '../../tabState';
import { getNestedSchema, getOriginalProperty } from './utils';
import { SchemaEditor } from './ToolSchemaEditor';


interface ToolEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool;
  modifiedTool?: ModifiedTool;
  onSave: (modifiedToolData: { name?: string; description?: string; schema: JSONSchema7 }) => void;
  onRevert: () => void;
}


export const ToolEditDialog: React.FC<ToolEditDialogProps> = ({
  open,
  onOpenChange,
  tool,
  modifiedTool,
  onSave,
  onRevert,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [currentName, setCurrentName] = useState(modifiedTool?.name || tool.name);
  const [currentDescription, setCurrentDescription] = useState(
    modifiedTool?.description || tool.description || ''
  );
  const [currentSchema, setCurrentSchema] = useState<JSONSchema7>(
    // Deep clone to prevent modifying original tool.inputSchema or modifiedTool.schema
    JSON.parse(JSON.stringify(modifiedTool?.schema || tool.inputSchema)) as JSONSchema7
  );
  
  // schemaPath stores names, e.g., ['Root', 'user', 'address']
  const [schemaPath, setSchemaPath] = useState<string[]>(['Root']);

  const originalRootSchema = tool.inputSchema as JSONSchema7;

  const hasChanges = useMemo(() => {
    return currentName !== tool.name ||
    currentDescription !== (tool.description || '') ||
    JSON.stringify(currentSchema) !== JSON.stringify(tool.inputSchema);
  }, [currentName, currentDescription, currentSchema, tool]);

  useEffect(() => {
    if (!hasChanges) {
      onRevert()
    }
  }, [hasChanges, onRevert])

  const handleResetAll = useCallback(() => {
    setCurrentName(tool.name);
    setCurrentDescription(tool.description || '');
    setCurrentSchema(JSON.parse(JSON.stringify(tool.inputSchema)) as JSONSchema7);
    setSchemaPath(['Root']);
    onRevert();
  }, [tool, onRevert]);

  const handleSave = useCallback(() => {
    onSave({
      name: currentName,
      description: currentDescription,
      schema: currentSchema,
    });
  }, [currentName, currentDescription, currentSchema, onSave]);

  useEffect(() => {
    // If an external modifiedTool is provided and changes, reset internal state
    setCurrentName(modifiedTool?.name || tool.name);
    setCurrentDescription(modifiedTool?.description || tool.description || '');
    setCurrentSchema(JSON.parse(JSON.stringify(modifiedTool?.schema || tool.inputSchema)) as JSONSchema7);
  }, [modifiedTool, tool]);

  // Function to recursively update schema
  // pathPrefix: path to the parent of the property being modified
  // propertyName: current name of the property to modify
  const updateSchemaProperty = useCallback((
    pathPrefix: string[],
    propertyName: string,
    updates: { description?: string; newName?: string; disabled?: boolean }
  ) => {
    setCurrentSchema(prevSchema => {
      const newSchema = JSON.parse(JSON.stringify(prevSchema)) as JSONSchema7; // Deep clone
      let parentSchema = getNestedSchema(newSchema, pathPrefix);
      
      if (!parentSchema || typeof parentSchema === 'boolean' || !parentSchema.properties) return prevSchema; // Should not happen

      const propSchema = parentSchema.properties[propertyName] as JSONSchema7 & { 'x-original-name'?: string; 'x-ui-disabled'?: boolean };
      if (!propSchema) return prevSchema; // Property not found

      const originalPropInfo = getOriginalProperty(originalRootSchema, pathPrefix, propertyName, propSchema);

      // Handle description
      if (updates.description !== undefined) {
        propSchema.description = updates.description;
      }

      // Handle disabling (only for originally optional properties)
      if (updates.disabled !== undefined && !originalPropInfo.wasRequired) {
        if (updates.disabled) {
          propSchema['x-ui-disabled'] = true;
        } else {
          delete propSchema['x-ui-disabled'];
        }
      }
      
      // Handle rename
      if (updates.newName && updates.newName !== propertyName) {
        const newName = updates.newName;
        // Store original name if not already set (first rename)
        if (!propSchema['x-original-name']) {
          propSchema['x-original-name'] = propertyName;
        }
        
        parentSchema.properties[newName] = propSchema;
        delete parentSchema.properties[propertyName];

        // Update required array if this property was originally required
        if (originalPropInfo.wasRequired) {
          parentSchema.required = parentSchema.required?.filter(name => name !== propertyName);
          if (!parentSchema.required?.includes(newName)) {
            parentSchema.required = [...(parentSchema.required || []), newName];
          }
        }
        
        // Update schemaPath if the renamed property is part of the current path
        const pathIndexToUpdate = pathPrefix.length; // Index of the property itself in full path
        if (schemaPath.length > pathIndexToUpdate && schemaPath[pathIndexToUpdate] === propertyName) {
            setSchemaPath(current => {
                const newP = [...current];
                newP[pathIndexToUpdate] = newName;
                return newP;
            });
        }
      }
      onSave({
        name: currentName,
        description: currentDescription,
        schema: newSchema,
      });
      return newSchema;
    });
  }, [currentName, currentDescription, originalRootSchema, schemaPath, onSave]);

  const revertSchemaProperty = useCallback((pathPrefix: string[], propertyName: string) => {
    setCurrentSchema(prevSchema => {
      const newSchema = JSON.parse(JSON.stringify(prevSchema)) as JSONSchema7;
      let parentSchema = getNestedSchema(newSchema, pathPrefix);
      const modifiedPropSchema = (parentSchema?.properties?.[propertyName]) as JSONSchema7 & { 'x-original-name'?: string };

      if (!parentSchema || typeof parentSchema === 'boolean' || !parentSchema.properties || !modifiedPropSchema) {
        return prevSchema;
      }

      const originalPropInfo = getOriginalProperty(originalRootSchema, pathPrefix, propertyName, modifiedPropSchema);
      const originalName = originalPropInfo.name;

      // If property was new (not in original schema by its original name)
      if (!originalPropInfo.schema) {
        delete parentSchema.properties[propertyName];
        parentSchema.required = parentSchema.required?.filter(name => name !== propertyName && name !== originalName);
      } else {
        // Restore from original
        const restoredProp = JSON.parse(JSON.stringify(originalPropInfo.schema)); // Deep clone original
        
        // Remove our custom fields from restored property
        delete (restoredProp as any)['x-original-name'];
        delete (restoredProp as any)['x-ui-disabled'];

        delete parentSchema.properties[propertyName]; // Remove current/renamed version
        parentSchema.properties[originalName] = restoredProp; // Add back with original name and schema

        // Update required array
        parentSchema.required = parentSchema.required?.filter(name => name !== propertyName && name !== originalName);
        if (originalPropInfo.wasRequired && !parentSchema.required?.includes(originalName)) {
          parentSchema.required = [...(parentSchema.required || []), originalName];
        }
        
        // If the propertyName was part of schemaPath and its name changed back to originalName
        const pathIndexToUpdate = pathPrefix.length;
        if (schemaPath.length > pathIndexToUpdate && schemaPath[pathIndexToUpdate] === propertyName && propertyName !== originalName) {
           setSchemaPath(current => {
                const newP = [...current];
                newP[pathIndexToUpdate] = originalName;
                return newP;
            });
        }
      }
     onSave({
        name: currentName,
        description: currentDescription,
        schema: newSchema,
      });
      return newSchema;
    });
  }, [originalRootSchema, schemaPath, currentName, currentDescription, onSave]);

  const navigateToProperty = (propertyName: string) => {
    setSchemaPath([...schemaPath, propertyName]);
  };

  const navigateToPathIndex = (index: number) => {
    setSchemaPath(schemaPath.slice(0, index + 1));
  };

  const currentSchemaLevel = getNestedSchema(currentSchema, schemaPath) || currentSchema; // Fallback to root
  const properties = typeof currentSchemaLevel === 'object' ? currentSchemaLevel.properties || {} : {};
  const required = typeof currentSchemaLevel === 'object' ? currentSchemaLevel.required || [] : [];
  const currentPathToParentProperties = schemaPath; // Path to the object whose properties are being listed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] h-5/6 sm:max-w-none overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          {/* Tool Name and Description Editing UI (similar to original, adapted for currentName/currentDescription) */}
          <DialogTitle className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <Input
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  onBlur={() => {
                    setEditingName(false)
                    handleSave()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingName(false)
                      handleSave()
                    }
                  }}
                  className="text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <div className="group/name flex items-center gap-2">
                  <h2 className={cn(
                    currentName !== tool.name && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded"
                  )}>
                    {currentName}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setEditingName(true)} className="h-6 w-6 p-0 opacity-0 group-hover/name:opacity-100 transition-opacity"> <Pencil className="h-3 w-3" /> </Button>
                  {currentName !== tool.name && (
                    <Button variant="ghost" size="sm" onClick={() => setCurrentName(tool.name)} className="h-6 w-6 p-0 opacity-0 group-hover/name:opacity-100 transition-opacity"> <RotateCcw className="h-3 w-3" /> </Button>
                  )}
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {editingDescription ? (
              <Textarea
                value={currentDescription}
                onChange={(e) => setCurrentDescription(e.target.value)}
                onBlur={() => {
                  setEditingDescription(false)
                  handleSave()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingDescription(false)
                    handleSave()
                  }
                }}
                placeholder="Tool description..."
                className="min-h-[60px] resize-none"
                autoFocus
              />
            ) : (
              <div className="group/desc flex items-start">
                <p className={cn(
                  "text-sm text-muted-foreground min-h-[20px] flex-1",
                  currentDescription !== (tool.description || '') && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded"
                )}>
                  {currentDescription || <em>No description</em>}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)} className="h-6 w-6 p-0 opacity-0 group-hover/desc:opacity-100 transition-opacity ml-2"> <Pencil className="h-3 w-3" /> </Button>
                {currentDescription !== (tool.description || '') && (
                  <Button variant="ghost" size="sm" onClick={() => setCurrentDescription(tool.description || '')} className="h-6 w-6 p-0 opacity-0 group-hover/desc:opacity-100 transition-opacity"> <RotateCcw className="h-3 w-3" /> </Button>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {hasChanges ? (
            <Tabs defaultValue="edit" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="edit">Edit Schema</TabsTrigger>
                <TabsTrigger value="diff">View Changes</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="flex-1 overflow-hidden">
                <SchemaEditor
                  schemaPath={schemaPath}
                  properties={properties}
                  required={required}
                  onNavigateToProperty={navigateToProperty}
                  onNavigateToPathIndex={navigateToPathIndex}
                  onUpdateProperty={updateSchemaProperty}
                  onRevertProperty={revertSchemaProperty}
                  originalRootSchema={originalRootSchema}
                  currentPathToParentProperties={currentPathToParentProperties}
                />
              </TabsContent>
              <TabsContent value="diff" className="flex-1 overflow-hidden p-1">
                <ToolSchemaDiff
                  originalTool={tool}
                  modifiedName={currentName}
                  modifiedDescription={currentDescription}
                  modifiedSchema={currentSchema}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <SchemaEditor
              schemaPath={schemaPath}
              properties={properties}
              required={required}
              onNavigateToProperty={navigateToProperty}
              onNavigateToPathIndex={navigateToPathIndex}
              onUpdateProperty={updateSchemaProperty}
              onRevertProperty={revertSchemaProperty}
              originalRootSchema={originalRootSchema}
              currentPathToParentProperties={currentPathToParentProperties}
            />
          )}
        </div>
        <DialogFooter>
      {hasChanges && ( <Button variant="destructive" onClick={handleResetAll}>Reset All</Button> )}
      </DialogFooter>
      </DialogContent>

    </Dialog>
  );
};