import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { RotateCcw } from "lucide-react";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { JSONSchema7 } from "json-schema";
import { ToolSchemaDiff } from "./ToolSchemaDiff";
import { cn } from "@/utils/tailwind";
import { getNestedSchema, getOriginalProperty } from "./utils";
import { SchemaEditor } from "./ToolSchemaEditor";
import stringify from "json-stable-stringify";
import { toast } from "sonner";
import { ModifiedTool } from "@/stores/types";

// TODO: HANDLE MODIFY/REVERT

interface ToolEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool;
  modifiedTool?: ModifiedTool;
  onSave: (modifiedToolData: {
    name?: string;
    description?: string;
    schema: JSONSchema7;
  }) => void;
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
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  // schemaPath stores names, e.g., ['Root', 'user', 'address']
  const [schemaPath, setSchemaPath] = useState<string[]>(["Root"]);

  const originalRootSchema = tool.inputSchema as JSONSchema7;

  // Get current values from modifiedTool or fallback to original tool
  const currentName = modifiedTool?.name || tool.name;
  const currentDescription =
    modifiedTool?.description || tool.description || "";
  const currentSchema =
    modifiedTool?.schema || (tool.inputSchema as JSONSchema7);

  const hasChanges = useMemo(() => {
    const namedChanged = currentName !== tool.name;
    const descChanged = currentDescription !== (tool.description || "");
    const schemaChanged =
      stringify(currentSchema) !== stringify(tool.inputSchema);

    const changed = namedChanged || descChanged || schemaChanged;

    return changed;
  }, [currentName, currentDescription, currentSchema, tool]);

  useEffect(() => {
    if (!hasChanges && modifiedTool) {
      onRevert();
    }
  }, [hasChanges, modifiedTool, onRevert]);

  // Position cursor at end when editing description
  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      const textarea = descriptionTextareaRef.current;
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [editingDescription]);

  const handleResetAll = useCallback(() => {
    setSchemaPath(["Root"]);
    onRevert();
    toast.success("All changes reverted");
  }, [onRevert]);

  const handleSave = useCallback(
    (updates: Partial<ModifiedTool>) => {
      onSave({
        name: updates.name !== undefined ? updates.name : currentName,
        description:
          updates.description !== undefined
            ? updates.description
            : currentDescription,
        schema: updates.schema || currentSchema,
      });
    },
    [currentName, currentDescription, currentSchema, onSave],
  );

  const handleNameChange = useCallback(
    (newName: string) => {
      handleSave({ name: newName });
    },
    [handleSave],
  );

  const handleDescriptionChange = useCallback(
    (newDescription: string) => {
      handleSave({ description: newDescription });
    },
    [handleSave],
  );

  // Function to recursively update schema
  // pathPrefix: path to the parent of the property being modified
  // propertyName: current name of the property to modify
  const updateSchemaProperty = useCallback(
    (
      pathPrefix: string[],
      propertyName: string,
      updates: { description?: string; newName?: string; disabled?: boolean },
    ) => {
      const newSchema = JSON.parse(
        JSON.stringify(currentSchema),
      ) as JSONSchema7; // Deep clone
      const parentSchema = getNestedSchema(newSchema, pathPrefix);

      if (
        !parentSchema ||
        typeof parentSchema === "boolean" ||
        !parentSchema.properties
      )
        return; // Should not happen

      const propSchema = parentSchema.properties[
        propertyName
      ] as JSONSchema7 & {
        "x-original-name"?: string;
        "x-ui-disabled"?: boolean;
      };
      if (!propSchema) return; // Property not found

      const originalPropInfo = getOriginalProperty(
        originalRootSchema,
        pathPrefix,
        propertyName,
        propSchema,
      );

      // Handle description
      if (updates.description !== undefined) {
        propSchema.description = updates.description;
      }

      // Handle disabling (only for originally optional properties)
      if (updates.disabled !== undefined && !originalPropInfo.wasRequired) {
        if (updates.disabled) {
          propSchema["x-ui-disabled"] = true;
        } else {
          delete propSchema["x-ui-disabled"];
        }
      }

      // Handle rename
      if (updates.newName && updates.newName !== propertyName) {
        const newName = updates.newName;
        // Store original name if not already set (first rename)
        if (!propSchema["x-original-name"]) {
          propSchema["x-original-name"] = propertyName;
        }

        parentSchema.properties[newName] = propSchema;
        delete parentSchema.properties[propertyName];

        // Update required array if this property was originally required
        if (originalPropInfo.wasRequired) {
          parentSchema.required = parentSchema.required?.filter(
            (name) => name !== propertyName,
          );
          if (!parentSchema.required?.includes(newName)) {
            parentSchema.required = [...(parentSchema.required || []), newName];
          }
        }

        // Update schemaPath if the renamed property is part of the current path
        const pathIndexToUpdate = pathPrefix.length; // Index of the property itself in full path
        if (
          schemaPath.length > pathIndexToUpdate &&
          schemaPath[pathIndexToUpdate] === propertyName
        ) {
          setSchemaPath((current) => {
            const newP = [...current];
            newP[pathIndexToUpdate] = newName;
            return newP;
          });
        }
      }

      handleSave({ schema: newSchema });
    },
    [currentSchema, originalRootSchema, schemaPath, handleSave],
  );

  const revertSchemaProperty = useCallback(
    (pathPrefix: string[], propertyName: string) => {
      const newSchema = JSON.parse(
        JSON.stringify(currentSchema),
      ) as JSONSchema7;
      const parentSchema = getNestedSchema(newSchema, pathPrefix);
      const modifiedPropSchema = parentSchema?.properties?.[
        propertyName
      ] as JSONSchema7 & { "x-original-name"?: string };

      if (
        !parentSchema ||
        typeof parentSchema === "boolean" ||
        !parentSchema.properties ||
        !modifiedPropSchema
      ) {
        return;
      }

      const originalPropInfo = getOriginalProperty(
        originalRootSchema,
        pathPrefix,
        propertyName,
        modifiedPropSchema,
      );
      const originalName = originalPropInfo.name;

      // If property was new (not in original schema by its original name)
      if (!originalPropInfo.schema) {
        delete parentSchema.properties[propertyName];
        parentSchema.required = parentSchema.required?.filter(
          (name) => name !== propertyName && name !== originalName,
        );
      } else {
        // Restore from original
        const restoredProp = JSON.parse(
          JSON.stringify(originalPropInfo.schema),
        ); // Deep clone original

        // Remove our custom fields from restored property
        delete restoredProp["x-original-name"];
        delete restoredProp["x-ui-disabled"];

        delete parentSchema.properties[propertyName]; // Remove current/renamed version
        parentSchema.properties[originalName] = restoredProp; // Add back with original name and schema

        // Update required array
        parentSchema.required = parentSchema.required?.filter(
          (name) => name !== propertyName && name !== originalName,
        );
        if (
          originalPropInfo.wasRequired &&
          !parentSchema.required?.includes(originalName)
        ) {
          parentSchema.required = [
            ...(parentSchema.required || []),
            originalName,
          ];
        }

        // If the propertyName was part of schemaPath and its name changed back to originalName
        const pathIndexToUpdate = pathPrefix.length;
        if (
          schemaPath.length > pathIndexToUpdate &&
          schemaPath[pathIndexToUpdate] === propertyName &&
          propertyName !== originalName
        ) {
          setSchemaPath((current) => {
            const newP = [...current];
            newP[pathIndexToUpdate] = originalName;
            return newP;
          });
        }
      }

      handleSave({ schema: newSchema });
    },
    [currentSchema, originalRootSchema, schemaPath, handleSave],
  );

  const navigateToProperty = (propertyName: string) => {
    setSchemaPath([...schemaPath, propertyName]);
  };

  const navigateToPathIndex = (index: number) => {
    setSchemaPath(schemaPath.slice(0, index + 1));
  };

  const currentSchemaLevel =
    getNestedSchema(currentSchema, schemaPath) || currentSchema; // Fallback to root
  const properties =
    typeof currentSchemaLevel === "object"
      ? currentSchemaLevel.properties || {}
      : {};
  const required =
    typeof currentSchemaLevel === "object"
      ? currentSchemaLevel.required || []
      : [];
  const currentPathToParentProperties = schemaPath; // Path to the object whose properties are being listed

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
        className="flex h-5/6 w-[70vw] flex-col overflow-hidden sm:max-w-none"
      >
        <DialogHeader className="space-y-3">
          {/* Tool Name and Description Editing UI */}
          <DialogTitle className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {editingName ? (
                <Input
                  defaultValue={currentName}
                  onBlur={(e) => {
                    setEditingName(false);
                    const newName = e.target.value;
                    if (newName !== tool.name) {
                      handleNameChange(newName);
                      toast.success("Tool name updated");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingName(false);
                      const newName = e.currentTarget.value;
                      if (newName !== tool.name) {
                        handleNameChange(newName);
                        toast.success("Tool name updated");
                      }
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      handleNameChange(tool.name); // Revert to original
                      setEditingName(false);
                    }
                  }}
                  className="text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <div className="group/name flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h2
                        className={cn(
                          "hover:bg-muted/50 cursor-pointer rounded px-2 py-1 transition-colors",
                          currentName !== tool.name &&
                            "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
                        )}
                        onClick={() => setEditingName(true)}
                      >
                        {currentName}
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit tool name</p>
                    </TooltipContent>
                  </Tooltip>
                  {currentName !== tool.name && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleNameChange(tool.name);
                        toast.success("Tool name reverted");
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {editingDescription ? (
              <Textarea
                ref={descriptionTextareaRef}
                defaultValue={currentDescription}
                onBlur={(e) => {
                  setEditingDescription(false);
                  const newDescription = e.target.value;
                  if (newDescription !== tool.description) {
                    handleDescriptionChange(newDescription);
                    toast.success("Tool description updated");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingDescription(false);
                    const newDescription = e.currentTarget.value;

                    if (newDescription !== tool.description) {
                      handleDescriptionChange(newDescription);
                      toast.success("Tool description updated");
                    }
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDescriptionChange(tool.description || ""); // Revert to original
                    setEditingDescription(false);
                  }
                }}
                placeholder="Tool description..."
                className="min-h-[60px] resize-none"
                autoFocus
              />
            ) : (
              <div className="group/desc flex items-start gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className={cn(
                        "text-muted-foreground hover:bg-muted/50 min-h-[20px] flex-1 cursor-pointer rounded px-2 py-1 text-sm transition-colors",
                        currentDescription !== (tool.description || "") &&
                          "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
                      )}
                      onClick={() => setEditingDescription(true)}
                    >
                      {currentDescription || <em>No description</em>}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit tool description</p>
                  </TooltipContent>
                </Tooltip>
                {currentDescription !== (tool.description || "") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleDescriptionChange(tool.description || "");
                      toast.success("Tool description reverted");
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {hasChanges ? (
            <Tabs defaultValue="edit" className="flex h-full flex-col">
              <div className="mb-2 flex items-center justify-between">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="edit">Edit Schema</TabsTrigger>
                  <TabsTrigger value="diff">View Changes</TabsTrigger>
                </TabsList>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetAll}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Reset All Changes
                </Button>
              </div>
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
              <TabsContent value="diff" className="flex-1 overflow-hidden">
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
      </DialogContent>
    </Dialog>
  );
};
