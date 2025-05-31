import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SchemaDialog } from "@/components/api-explorer/SchemaDialog";
import { cn } from "@/utils/tailwind";
import { Pencil } from "lucide-react";

interface ToolParameterSchemaProps {
  className?: string;
  schema: any;
  name: string;
  editable?: boolean;
}

export const ToolParameterSchema: React.FC<ToolParameterSchemaProps> = ({ schema, name, className, editable }) => {
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
  
  return (
    <>
    {editable ? <Button variant="ghost" size="icon" className={cn("h-6 w-6", className)} onClick={() => setDialogOpen(true)}>
<Pencil className="!size-3" />
    </Button> :
      <Button 
        variant="ghost" 
        size="sm" 
        className={cn("h-6 px-2 text-xs", className)}
        onClick={() => setDialogOpen(true)}
      >
        View Schema
      </Button>}
      
      <SchemaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schema={isObject && propertiesCount === 1 ? schema.properties[Object.keys(schema.properties)[0]] : schema}
        title={`${name} Schema`}
      />
    </>
  );
};
