import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { SchemaDialog } from "@/components/api-explorer/SchemaDialog";

interface ToolParameterSchemaProps {
  schema: any;
  name: string;
}

export const ToolParameterSchema: React.FC<ToolParameterSchemaProps> = ({ schema, name }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const isObject = schema.type === 'object' || (schema.properties && Object.keys(schema.properties).length > 0);
  const isArray = schema.type === 'array' && schema.items;
  const hasComplexItems = isArray && (
    schema.items && (schema.items.type === 'object' || schema.items.properties)
  );
  
  const canViewSchema = isObject || hasComplexItems;
  
  return (
    <div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-6 px-2 text-xs"
        onClick={() => setDialogOpen(true)}
      >
        View Schema
      </Button>
      
      {canViewSchema && (
        <SchemaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schema={schema}
          title={`${name} Schema`}
        />
      )}
    </div>
  );
};
