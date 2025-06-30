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
  DialogFooter,
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

import { RotateCcw, Save } from "lucide-react";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { JSONSchema7 } from "json-schema";
import { ToolSchemaDiff } from "./ToolSchemaDiff";
import { cn } from "@/utils/tailwind";
import { getNestedSchema, getOriginalProperty } from "./utils";
import { SchemaEditor } from "./ToolSchemaEditor";
import stringify from "json-stable-stringify";
import { toast } from "sonner";
import {
  updateMcpToolWithStoreSync,
  revertMcpToolWithStoreSync,
} from "@/ipc/mcp/mcp-client";
import type {
  ToolAnnotations,
  SummonTool,
  ToolDefinition,
} from "@/lib/mcp/tool";

interface ToolEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: Tool;
  mcpId: string;
}

interface UnsavedChanges {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
}

export const ToolEditDialog: React.FC<ToolEditDialogProps> = ({
  open,
  onOpenChange,
  tool,
  mcpId,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const annotations = tool.annotations as ToolAnnotations | undefined;
  // Determine if this is an external tool based on annotations
  const isExternal = annotations?.isExternal ?? false;

  // Determine the original tool definition
  const originalToolDefinition = useMemo(
    () =>
      annotations?.originalDefinition || {
        name: annotations?.id || tool.name,
        description: tool.description || "",
        inputSchema: tool.inputSchema as JSONSchema7,
      },
    [tool, annotations],
  );

  const originalToolName = annotations?.id || originalToolDefinition.name;

  // State for unsaved changes - initially set to current tool values
  const [unsavedChanges, setUnsavedChanges] = useState<UnsavedChanges>({
    name: tool.name.replace(annotations?.prefix || "", ""),
    description: tool.description || "",
    inputSchema: tool.inputSchema as JSONSchema7,
  });

  // schemaPath stores names, e.g., ['Root', 'user', 'address']
  const [schemaPath, setSchemaPath] = useState<string[]>(["Root"]);

  // Determine if there are unsaved changes - compare against original
  const hasUnsavedChanges = useMemo(() => {
    const nameChanged = unsavedChanges.name !== originalToolDefinition.name;
    const descChanged =
      unsavedChanges.description !== originalToolDefinition.description;
    const schemaChanged =
      stringify(unsavedChanges.inputSchema) !==
      stringify(originalToolDefinition.inputSchema);

    return nameChanged || descChanged || schemaChanged;
  }, [unsavedChanges, originalToolDefinition]);

  // Reset unsaved changes when dialog opens/closes or tool changes
  useEffect(() => {
    if (open) {
      setUnsavedChanges({
        name: tool.name.replace(annotations?.prefix || "", ""),
        description: tool.description || "",
        inputSchema: tool.inputSchema as JSONSchema7,
      });
      setSchemaPath(["Root"]);
    }
  }, [open, tool, annotations]);

  // Position cursor at end when editing description
  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      const textarea = descriptionTextareaRef.current;
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [editingDescription]);

  const handleNameChange = useCallback((newName: string) => {
    setUnsavedChanges((prev) => ({ ...prev, name: newName }));
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setUnsavedChanges((prev) => ({ ...prev, description: newDescription }));
  }, []);

  const handleSchemaChange = useCallback((newSchema: JSONSchema7) => {
    setUnsavedChanges((prev) => ({ ...prev, inputSchema: newSchema }));
  }, []);

  // Function to recursively update schema - only allow description changes
  const updateSchemaProperty = useCallback(
    (
      pathPrefix: string[],
      propertyName: string,
      updates: { description?: string; newName?: string; disabled?: boolean },
    ) => {
      const newSchema = JSON.parse(
        JSON.stringify(unsavedChanges.inputSchema),
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
        "x-ui-disabled"?: boolean;
      };
      if (!propSchema) return; // Property not found

      const originalPropInfo = getOriginalProperty(
        originalToolDefinition.inputSchema,
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

      // Ignore newName updates since we don't allow name editing in this mode
      // The allowNameEditing=false prop in SchemaEditor prevents the UI from calling this

      handleSchemaChange(newSchema);
    },
    [
      unsavedChanges.inputSchema,
      originalToolDefinition.inputSchema,
      handleSchemaChange,
    ],
  );

  const revertSchemaProperty = useCallback(
    (pathPrefix: string[], propertyName: string) => {
      const newSchema = JSON.parse(
        JSON.stringify(unsavedChanges.inputSchema),
      ) as JSONSchema7;
      const parentSchema = getNestedSchema(newSchema, pathPrefix);
      const modifiedPropSchema = parentSchema?.properties?.[
        propertyName
      ] as JSONSchema7;

      if (
        !parentSchema ||
        typeof parentSchema === "boolean" ||
        !parentSchema.properties ||
        !modifiedPropSchema
      ) {
        return;
      }

      const originalPropInfo = getOriginalProperty(
        originalToolDefinition.inputSchema,
        pathPrefix,
        propertyName,
        modifiedPropSchema,
      );

      if (originalPropInfo.schema) {
        // Restore from original
        const restoredProp = JSON.parse(
          JSON.stringify(originalPropInfo.schema),
        ); // Deep clone original

        // Remove our custom fields from restored property
        delete restoredProp["x-ui-disabled"];

        parentSchema.properties[propertyName] = restoredProp;
      }

      handleSchemaChange(newSchema);
    },
    [
      unsavedChanges.inputSchema,
      originalToolDefinition.inputSchema,
      handleSchemaChange,
    ],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (hasUnsavedChanges) {
        // Save the current changes
        const toolDefinition: ToolDefinition = {
          name: unsavedChanges.name,
          description: unsavedChanges.description,
          inputSchema: unsavedChanges.inputSchema,
        };

        const summonTool: SummonTool = {
          apiId: annotations?.apiId,
          mcpId,
          isExternal,
          originalToolName,
          definition: toolDefinition,
        };

        const result = await updateMcpToolWithStoreSync(tool.name, summonTool);
        if (!result.success) {
          toast.error("Failed to update tool: " + result.message);
          return;
        }

        toast.success("Tool updated!");
      } else {
        // No unsaved changes - revert to original tool definition
        const result = await revertMcpToolWithStoreSync(tool.name, {
          apiId: annotations?.apiId,
          mcpId,
          isExternal,
          originalToolName,
        });

        if (!result.success) {
          toast.error("Failed to revert tool");
          return;
        }

        toast.success("Tool reverted to original state");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating tool:", error);
      toast.error(
        hasUnsavedChanges ? "Failed to update tool" : "Failed to revert tool",
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    hasUnsavedChanges,
    unsavedChanges,
    tool,
    mcpId,
    isExternal,
    annotations,
    originalToolDefinition,
    onOpenChange,
  ]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel?",
      );
      if (!confirmed) return;
    }
    onOpenChange(false);
  }, [hasUnsavedChanges, onOpenChange]);

  const handleRevertAllChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      const result = await revertMcpToolWithStoreSync(tool.name, {
        apiId: annotations?.apiId,
        mcpId,
        isExternal,
        originalToolName,
      });

      if (!result.success) {
        toast.error("Failed to update tool: " + result.message);
        return;
      }
      setUnsavedChanges({
        name: originalToolDefinition.name,
        description: originalToolDefinition.description,
        inputSchema: originalToolDefinition.inputSchema,
      });

      setSchemaPath(["Root"]);
      toast.success("Reverted all changes");
    } catch (error) {
      console.error("Error reverting tool:", error);
      toast.error("Failed to revert tool");
    } finally {
      setIsSaving(false);
    }
  }, [originalToolDefinition]);

  const navigateToProperty = (propertyName: string) => {
    setSchemaPath([...schemaPath, propertyName]);
  };

  const navigateToPathIndex = (index: number) => {
    setSchemaPath(schemaPath.slice(0, index + 1));
  };

  const currentSchemaLevel =
    getNestedSchema(unsavedChanges.inputSchema, schemaPath) ||
    unsavedChanges.inputSchema;
  const properties =
    typeof currentSchemaLevel === "object"
      ? currentSchemaLevel.properties || {}
      : {};
  const required =
    typeof currentSchemaLevel === "object"
      ? currentSchemaLevel.required || []
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          handleCancel();
        }}
        className="flex h-5/6 w-[70vw] flex-col overflow-hidden sm:max-w-none"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              {editingName ? (
                <Input
                  defaultValue={unsavedChanges.name}
                  onBlur={(e) => {
                    setEditingName(false);
                    handleNameChange(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setEditingName(false);
                      handleNameChange(e.currentTarget.value);
                    }
                    if (e.key === "Escape") {
                      e.stopPropagation();
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
                          unsavedChanges.name !== originalToolDefinition.name &&
                            "text-blue-600 dark:text-blue-500",
                        )}
                        onClick={() => setEditingName(true)}
                      >
                        {unsavedChanges.name}
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit tool name</p>
                    </TooltipContent>
                  </Tooltip>
                  {unsavedChanges.name !== originalToolDefinition.name && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleNameChange(originalToolDefinition.name)
                      }
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
                defaultValue={unsavedChanges.description}
                onBlur={(e) => {
                  setEditingDescription(false);
                  handleDescriptionChange(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    setEditingDescription(false);
                    handleDescriptionChange(e.currentTarget.value);
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
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
                        unsavedChanges.description !==
                          originalToolDefinition.description &&
                          "text-blue-600 dark:text-blue-500",
                      )}
                      onClick={() => setEditingDescription(true)}
                    >
                      {unsavedChanges.description || <em>No description</em>}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit tool description</p>
                  </TooltipContent>
                </Tooltip>
                {unsavedChanges.description !==
                  originalToolDefinition.description && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleDescriptionChange(
                        originalToolDefinition.description,
                      )
                    }
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
          {hasUnsavedChanges ? (
            <Tabs defaultValue="edit" className="flex h-full flex-col">
              <div className="mb-2 flex items-center justify-between">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="edit">Edit Schema</TabsTrigger>
                  <TabsTrigger value="diff">View Changes</TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRevertAllChanges}
                >
                  Revert All Changes
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
                  originalRootSchema={originalToolDefinition.inputSchema}
                  currentPathToParentProperties={schemaPath}
                  allowNameEditing={false}
                />
              </TabsContent>
              <TabsContent value="diff" className="flex-1 overflow-hidden">
                <ToolSchemaDiff
                  originalTool={
                    {
                      name: originalToolDefinition.name,
                      description: originalToolDefinition.description,
                      inputSchema: originalToolDefinition.inputSchema,
                    } as Tool
                  }
                  modifiedName={unsavedChanges.name}
                  modifiedDescription={unsavedChanges.description}
                  modifiedSchema={unsavedChanges.inputSchema}
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
              originalRootSchema={originalToolDefinition.inputSchema}
              currentPathToParentProperties={schemaPath}
              allowNameEditing={false}
            />
          )}
        </div>

        {hasUnsavedChanges || annotations?.originalDefinition ? (
          <DialogFooter className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {hasUnsavedChanges ? (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {isSaving ? "Reverting..." : "Revert to Original"}
                </>
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
