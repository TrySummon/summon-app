import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SchemaDialog } from "./SchemaDialog";
import { cn } from "@/utils/tailwind";
import { Pencil } from "lucide-react";
import { ToolParameterSchemaProps } from "./types";

/**
 * ToolParameterSchema component that provides a button to view or edit a schema.
 * It conditionally renders either an edit button or a view schema button based on the editable prop.
 */
export const ToolParameterSchema: React.FC<ToolParameterSchemaProps> = ({ 
  schema, 
  modifiedSchema,
  name, 
  className, 
  editable,
  onChange 
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const propertiesCount = schema.properties ? Object.keys(schema.properties).length : 0;
  const isObject = schema.type === 'object' || (propertiesCount > 0);
  const isArray = schema.type === 'array' && schema.items;
  const hasComplexItems = isArray && (
    schema.items && (schema.items.type === 'object' || schema.items.properties)
  );
  
  const canViewSchema = isObject || hasComplexItems;

  if (!canViewSchema) {
    return null;
  }
  
  // Determine which schema to use
  // If there's only one property and it's an object, use that property's schema
  const effectiveSchema = isObject && propertiesCount === 1 
    ? schema.properties[Object.keys(schema.properties)[0]] 
    : schema;
    
  const effectiveModifiedSchema = modifiedSchema 
    ? (isObject && propertiesCount === 1 
      ? modifiedSchema.properties[Object.keys(modifiedSchema.properties)[0]] 
      : modifiedSchema) 
    : undefined;
  
  return (
    <>
      {editable ? (
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-6 w-6 p-0", className)} 
          onClick={() => setDialogOpen(true)}
          title="Edit schema"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      ) : (
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn("h-6 px-2 text-xs", className)}
          onClick={() => setDialogOpen(true)}
          title="View schema details"
        >
         View Schema
        </Button>
      )}
      
      <SchemaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schema={effectiveSchema}
        modifiedSchema={effectiveModifiedSchema}
        name={name}
        editable={editable}
        onChange={onChange}
      />
    </>
  );
};
