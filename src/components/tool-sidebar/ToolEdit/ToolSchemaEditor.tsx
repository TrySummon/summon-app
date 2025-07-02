import React, { useMemo, useState, useRef, useEffect } from "react";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/tailwind";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronRight, RotateCcw } from "lucide-react";
import { formatTypeInfo, getOriginalProperty } from "./utils";

interface SchemaEditorProps {
  schemaPath: string[];
  properties: Record<string, JSONSchema7Definition>;
  required: string[];
  onNavigateToProperty: (propertyName: string) => void;
  onNavigateToPathIndex: (index: number) => void;
  onUpdateProperty: (
    pathPrefix: string[],
    propertyName: string,
    updates: { description?: string; newName?: string; disabled?: boolean },
  ) => void;
  onRevertProperty: (pathPrefix: string[], propertyName: string) => void;
  originalRootSchema: JSONSchema7;
  currentPathToParentProperties: string[]; // Path to the object whose properties are being listed
  allowNameEditing?: boolean; // New prop to control name editing
}

export const SchemaEditor: React.FC<SchemaEditorProps> = ({
  schemaPath,
  properties,
  // required, // This `required` is from modified schema, use original for disable logic
  onNavigateToProperty,
  onNavigateToPathIndex,
  onUpdateProperty,
  onRevertProperty,
  originalRootSchema,
  currentPathToParentProperties,
  allowNameEditing = true, // Default to true for backward compatibility
}) => {
  const [editingPropertyDesc, setEditingPropertyDesc] = useState<string | null>(
    null,
  );
  const [currentDescValue, setCurrentDescValue] = useState("");
  const [editingPropertyName, setEditingPropertyName] = useState<string | null>(
    null,
  );
  const [currentNameValue, setCurrentNameValue] = useState("");
  const propertyDescTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleStartEditDesc = (propName: string, desc: string) => {
    setEditingPropertyDesc(propName);
    setCurrentDescValue(desc);
  };

  const handleSaveEditDesc = () => {
    if (editingPropertyDesc) {
      onUpdateProperty(currentPathToParentProperties, editingPropertyDesc, {
        description: currentDescValue,
      });
    }
    setEditingPropertyDesc(null);
  };

  const handleStartEditName = (propName: string) => {
    if (!allowNameEditing) return; // Don't allow name editing if disabled
    setEditingPropertyName(propName);
    setCurrentNameValue(propName);
  };

  const handleSaveEditName = () => {
    if (
      editingPropertyName &&
      currentNameValue &&
      currentNameValue !== editingPropertyName &&
      allowNameEditing
    ) {
      // Only call with newName if name editing is allowed
      onUpdateProperty(currentPathToParentProperties, editingPropertyName, {
        newName: currentNameValue,
      });
    }
    setEditingPropertyName(null);
  };

  const handleRevertProperty = (propName: string) => {
    onRevertProperty(currentPathToParentProperties, propName);
  };

  const handleToggleProperty = (
    propertyName: string,
    isCurrentlyDisabled: boolean,
  ) => {
    onUpdateProperty(currentPathToParentProperties, propertyName, {
      disabled: !isCurrentlyDisabled,
    });
  };

  const sortedProperties = useMemo(() => {
    return Object.entries(properties).sort((a, b) => a[0].localeCompare(b[0]));
  }, [properties]);

  // Position cursor at end when editing property description
  useEffect(() => {
    if (editingPropertyDesc && propertyDescTextareaRef.current) {
      const textarea = propertyDescTextareaRef.current;
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, [editingPropertyDesc]);

  return (
    <div className="flex h-full flex-col space-y-4">
      {schemaPath.length > 1 && (
        <Breadcrumb>
          <BreadcrumbList className="border-none">
            {schemaPath.map((pathItemName, index) => (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator />}
                {index === schemaPath.length - 1 ? (
                  <BreadcrumbPage className="h-auto px-0 font-medium">
                    {pathItemName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => onNavigateToPathIndex(index)}
                      className="hover:text-foreground cursor-pointer"
                    >
                      {pathItemName}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto">
        {sortedProperties.map(([propertyName, propSchemaUntyped]) => {
          if (typeof propSchemaUntyped === "boolean") return null; // Should not happen with valid schemas
          const propSchema = propSchemaUntyped as JSONSchema7 & {
            "x-original-name"?: string;
            "x-ui-disabled"?: boolean;
          };

          const { schema: originalPropDef, wasRequired: isOriginallyRequired } =
            getOriginalProperty(
              originalRootSchema,
              currentPathToParentProperties,
              propertyName,
              propSchema,
            );

          const isNameModified =
            !!propSchema["x-original-name"] &&
            propSchema["x-original-name"] !== propertyName;
          const isNewProperty = !originalPropDef;
          const isDescriptionModified =
            !isNewProperty &&
            originalPropDef &&
            (propSchema.description || "") !==
              (originalPropDef.description || "");
          const isDisabledUi = !!propSchema["x-ui-disabled"];
          const isDisabledStatusChanged =
            !isNewProperty &&
            originalPropDef &&
            isDisabledUi !==
              !!(originalPropDef as Record<string, boolean>)?.["x-ui-disabled"];

          const isModified =
            isNameModified ||
            isNewProperty ||
            isDescriptionModified ||
            isDisabledStatusChanged;

          const hasNestedProperties =
            propSchema.type === "object" && propSchema.properties;
          const isEditingThisDesc = editingPropertyDesc === propertyName;
          const isEditingThisName = editingPropertyName === propertyName;

          return (
            <div
              key={propertyName}
              className={cn(
                "hover:bg-muted/50 space-y-2 rounded-lg border p-3 transition-colors",
                isDisabledUi && "bg-gray-50 opacity-60 dark:bg-gray-900/30",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {isEditingThisName ? (
                    <Input
                      value={currentNameValue}
                      onChange={(e) => setCurrentNameValue(e.target.value)}
                      onBlur={handleSaveEditName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEditName();
                        if (e.key === "Escape") {
                          e.stopPropagation();
                          setCurrentNameValue(propertyName); // Revert to original
                          setEditingPropertyName(null);
                        }
                      }}
                      className="h-7 w-40 font-mono text-sm font-semibold"
                      autoFocus
                      disabled={isDisabledUi || !allowNameEditing}
                    />
                  ) : (
                    <div className="group/propname flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <code
                            className={cn(
                              allowNameEditing
                                ? "hover:bg-muted/50 cursor-pointer rounded px-1 py-0.5 font-mono text-sm font-semibold transition-colors"
                                : "rounded px-1 py-0.5 font-mono text-sm font-semibold",
                              (isNameModified || isNewProperty) &&
                                "text-blue-600 dark:text-blue-400",
                            )}
                            onClick={
                              !isDisabledUi && allowNameEditing
                                ? () => handleStartEditName(propertyName)
                                : undefined
                            }
                          >
                            {propertyName}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {allowNameEditing
                              ? "Edit property name"
                              : "Property name (read-only)"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {propSchema.type && (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground font-mono text-xs"
                    >
                      {propSchema.type}
                    </Badge>
                  )}
                  {isOriginallyRequired && (
                    <Badge
                      variant="outline"
                      className="border-red-500/50 bg-red-500/10 font-mono text-xs text-red-500"
                    >
                      required
                    </Badge>
                  )}
                  {isDisabledUi && (
                    <Badge
                      variant="outline"
                      className="border-orange-500/50 bg-orange-500/10 font-mono text-xs text-orange-500"
                    >
                      disabled
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isModified && !isDisabledUi && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevertProperty(propertyName)}
                      className="h-6 w-6 p-0"
                      title="Revert property changes"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  {!isOriginallyRequired && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleProperty(propertyName, isDisabledUi)
                      }
                      className="h-7 px-2 text-xs"
                      title={
                        isDisabledUi ? "Enable property" : "Disable property"
                      }
                    >
                      {isDisabledUi ? "Enable" : "Disable"}
                    </Button>
                  )}
                  {hasNestedProperties && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateToProperty(propertyName)}
                      className="h-7 px-2 text-xs"
                    >
                      Explore <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Enum values section - separate from badges */}
              {propSchema.type &&
                (() => {
                  const typeInfo = formatTypeInfo(propSchema);
                  return typeInfo.hasEnum ? (
                    <div className="p-1">
                      <span className="text-muted-foreground mb-2 block text-sm font-medium">
                        Possible values:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {typeInfo.enumValues!.map((value, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-muted text-muted-foreground font-mono text-xs"
                          >
                            {JSON.stringify(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              <div>
                {isEditingThisDesc ? (
                  <Textarea
                    ref={propertyDescTextareaRef}
                    value={currentDescValue}
                    onChange={(e) => setCurrentDescValue(e.target.value)}
                    onBlur={handleSaveEditDesc}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEditDesc();
                      }
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        setCurrentDescValue(propSchema.description || ""); // Revert to original
                        setEditingPropertyDesc(null);
                      }
                    }}
                    placeholder="Property description..."
                    className="min-h-[50px] resize-none text-sm"
                    autoFocus
                    disabled={isDisabledUi}
                  />
                ) : (
                  <div className="group/propdesc flex items-start gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p
                          className={cn(
                            "text-muted-foreground hover:bg-muted/50 min-h-[20px] flex-1 cursor-pointer rounded px-2 py-1 text-sm transition-colors",
                            isDescriptionModified &&
                              "text-blue-600 dark:text-blue-400",
                          )}
                          onClick={
                            !isDisabledUi
                              ? () =>
                                  handleStartEditDesc(
                                    propertyName,
                                    propSchema.description || "",
                                  )
                              : undefined
                          }
                        >
                          {propSchema.description || <em>No description</em>}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Edit property description</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {Object.keys(properties).length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            No properties in this schema level.
          </div>
        )}
      </div>
    </div>
  );
};
