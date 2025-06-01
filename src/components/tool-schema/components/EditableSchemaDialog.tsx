import React, { useState, useEffect, useMemo } from 'react';
import { OpenAPIV3 } from 'openapi-types';
import { 
  Dialog, 
  DialogContent
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchemaDialogHeader } from './SchemaDialogHeader';
import { EditablePropertyItem } from './EditablePropertyItem';
import { DiffView } from './DiffView';
import { EditableSchemaDialogProps, SchemaHistoryItem, PropertyEdit } from '../types';

export const EditableSchemaDialog: React.FC<EditableSchemaDialogProps> = ({
  open,
  onOpenChange,
  schema: initialSchema,
  modifiedSchema: initialModifiedSchema,
  name: initialName,
  editable = false,
  onChange,
}) => {
  // Schema navigation history
  const [schemaHistory, setSchemaHistory] = useState<SchemaHistoryItem[]>([
    { 
      schema: initialSchema, 
      name: initialName,
      modifiedSchema: initialModifiedSchema || JSON.parse(JSON.stringify(initialSchema)),
    }
  ]);
  
  // Current schemas
  const currentOriginalSchema = schemaHistory[schemaHistory.length - 1].schema;
  const currentModifiedSchema = schemaHistory[schemaHistory.length - 1].modifiedSchema || JSON.parse(JSON.stringify(currentOriginalSchema));

  // Editing states
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [editingProperties, setEditingProperties] = useState<Record<string, PropertyEdit>>({});
  
  // Initialize editing properties when schema changes
  useEffect(() => {
    if (currentOriginalSchema.properties) {
      const newEditingProperties: Record<string, PropertyEdit> = {};
      Object.entries(currentOriginalSchema.properties).forEach(([propName, propSchema]) => {
        newEditingProperties[propName] = {
          name: propName,
          description: ('description' in propSchema && propSchema.description) || '',
          isRequired: currentOriginalSchema.required?.includes(propName) || false,
          isDisabled: false,
        };
      });
      setEditingProperties(newEditingProperties);
    }
  }, [currentOriginalSchema]);

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    if (nameValue !== initialName) return true;
    return JSON.stringify(currentModifiedSchema) !== JSON.stringify(currentOriginalSchema);
  }, [currentModifiedSchema, currentOriginalSchema, nameValue, initialName]);

  // Navigate to a nested schema
  const navigateToSchema = (originalSchema: OpenAPIV3.SchemaObject, modifiedSchema: OpenAPIV3.SchemaObject, name: string) => {
    setSchemaHistory([...schemaHistory, { 
      schema: originalSchema,
      name,
      modifiedSchema: modifiedSchema,
    }]);
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
      setTimeout(() => {
        setSchemaHistory([{ 
          schema: initialSchema,
          name: initialName,
          modifiedSchema: initialModifiedSchema || JSON.parse(JSON.stringify(initialSchema)),
        }]);
        setEditingProperties({});
        setEditingName(false);
        setNameValue(initialName);
      }, 300);
    }
    onOpenChange(open);
  };

  // Update property in modified schema
  const updateProperty = (oldName: string, newName: string, description: string, isRequired: boolean, isDisabled: boolean) => {
    const newModifiedSchema = JSON.parse(JSON.stringify(currentModifiedSchema));
    const propSchema = newModifiedSchema.properties[oldName];

    if (isDisabled) {
      if (newModifiedSchema.properties && newModifiedSchema.properties[oldName]) {
        propSchema.disabled = true;
      }
    } else {
      // Update or rename property
      if (newModifiedSchema.properties && newModifiedSchema.properties[oldName]) {
        // Update description
        if ('description' in propSchema || description) {
          (propSchema as any).description = description;
        }
        
        // Handle renaming
        if (oldName !== newName) {
          newModifiedSchema.properties[newName] = propSchema;
          delete newModifiedSchema.properties[oldName];
          
          // Update required array
          if (newModifiedSchema.required) {
            const requiredIndex = newModifiedSchema.required.indexOf(oldName);
            if (requiredIndex !== -1) {
              newModifiedSchema.required[requiredIndex] = newName;
            }
          }
        }
        
        // Handle required status
        if (!newModifiedSchema.required) {
          newModifiedSchema.required = [];
        }
        
        const currentlyRequired = newModifiedSchema.required.includes(newName);
        if (isRequired && !currentlyRequired) {
          newModifiedSchema.required.push(newName);
        } else if (!isRequired && currentlyRequired) {
          newModifiedSchema.required = newModifiedSchema.required.filter((req: string) => req !== newName);
        }
      }
    }
    
    // Update history
    const newHistory = [...schemaHistory];
    newHistory[newHistory.length - 1].modifiedSchema = newModifiedSchema;
    setSchemaHistory(newHistory);
    
    // Call onChange if at root level
    if (schemaHistory.length === 1 && onChange) {
      onChange(newModifiedSchema, nameValue);
    }
  };

  // Save changes for a property
  const savePropertyChanges = (propName: string) => {
    const edit = editingProperties[propName];
    if (edit) {
      updateProperty(propName, edit.name, edit.description, edit.isRequired, edit.isDisabled);
      
      // Update editing properties state
      const newEditingProperties = { ...editingProperties };
      // Don't delete the property from editingProperties when disabled
      // This allows us to keep showing it in the UI
      if (edit.name !== propName) {
        // Handle rename
        newEditingProperties[edit.name] = edit;
        delete newEditingProperties[propName];
      }
      setEditingProperties(newEditingProperties);
    }
  };

  // Reset property changes
  const resetPropertyChanges = (propName: string) => {
    if (currentOriginalSchema.properties && currentOriginalSchema.properties[propName]) {
      const propSchema = currentOriginalSchema.properties[propName];
      setEditingProperties(prev => ({
        ...prev,
        [propName]: {
          name: propName,
          description: ('description' in propSchema && propSchema.description) || '',
          isRequired: currentOriginalSchema.required?.includes(propName) || false,
          isDisabled: false,
        }
      }));
    }
  };

  // Save tool name changes
  const saveNameChanges = () => {
    setEditingName(false);
    if (onChange) {
      onChange(currentModifiedSchema, nameValue);
    }
  };

  // Reset tool name changes
  const resetNameChanges = () => {
    setNameValue(initialName);
    setEditingName(false);
  };

  // Reset all changes
  const resetAllChanges = () => {
    setSchemaHistory([{ 
      schema: initialSchema, 
      name: initialName,
      modifiedSchema: initialModifiedSchema || JSON.parse(JSON.stringify(initialSchema)),
    }]);
    setEditingProperties({});
    setEditingName(false);
    setNameValue(initialName);
  };

  // Handle property edit change
  const handlePropertyEditChange = (propName: string, edit: PropertyEdit) => {
    setEditingProperties(prev => ({
      ...prev,
      [propName]: edit
    }));
  };

  // Handle tool name change
  const handleNameChange = (value: string) => {
    setNameValue(value);
    // Auto-save tool name after delay
    setTimeout(() => saveNameChanges(), 500);
  };

  // Render editable properties
  const renderEditableProperties = () => {
    if (!currentModifiedSchema.properties && Object.keys(editingProperties).length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No properties defined</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {Object.entries(currentOriginalSchema.properties || {}).map(([propName, originalPropSchema]) => {
          const edit = editingProperties[propName];
          if (!edit) return null;
          
          // Get the current property schema for type information
          const propSchema = currentModifiedSchema.properties?.[propName] || originalPropSchema;
          
          // Compare against original schema for accurate change detection
          const originalDescription = (originalPropSchema && 'description' in originalPropSchema && originalPropSchema.description) || '';
          const originalIsRequired = currentOriginalSchema.required?.includes(propName) || false;

          return (
            <EditablePropertyItem
              key={propName}
              propName={propName}
              originalPropSchema={originalPropSchema}
              propSchema={propSchema}
              edit={edit}
              originalDescription={originalDescription}
              originalIsRequired={originalIsRequired}
              onEditChange={handlePropertyEditChange}
              onReset={resetPropertyChanges}
              onSave={savePropertyChanges}
            />
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[60vw] h-5/6 sm:max-w-none overflow-hidden flex flex-col">
        <SchemaDialogHeader
          schema={currentModifiedSchema}
          historyLength={schemaHistory.length}
          hasChanges={hasChanges}
          name={initialName}
          editingName={editingName}
          nameValue={nameValue}
          editable={editable}
          onGoBack={goBack}
          onResetAll={resetAllChanges}
          onEditName={() => setEditingName(true)}
          onNameChange={handleNameChange}
          onResetName={resetNameChanges}
        />
        
        <div className="flex-1 overflow-hidden">
          {editable && hasChanges ? (
            <Tabs defaultValue="edit" className="h-full flex flex-col">
              <TabsList className="mx-6 mt-4 mb-0 w-fit">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="diff">Diff</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="flex-1 overflow-y-auto mt-0 px-6 pb-6">
                {'type' in currentModifiedSchema ? (
                  currentModifiedSchema.type === 'object' ? (
                    renderEditableProperties()
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">Only object schemas can be edited</p>
                    </div>
                  )
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Schema details not available</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="diff" className="flex-1 overflow-y-auto mt-0 px-6 pb-6">
                <DiffView 
                  originalSchema={currentOriginalSchema} 
                  modifiedSchema={currentModifiedSchema}
                  editingProperties={editingProperties}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full overflow-y-auto px-6 pb-6">
              {'type' in currentModifiedSchema ? (
                currentModifiedSchema.type === 'object' ? (
                  renderEditableProperties()
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Only object schemas can be edited</p>
                  </div>
                )
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Schema details not available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
