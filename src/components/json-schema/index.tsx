import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { JsonSchemaDialog } from "./JsonSchemaDialog";
import { OpenAPIV3 } from "openapi-types";

interface JsonSchemaProps {
  className?: string;
  schema: OpenAPIV3.SchemaObject;
  name: string;
}

export const JsonSchema: React.FC<JsonSchemaProps> = ({
  schema,
  name,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const propertiesCount = schema.properties
    ? Object.keys(schema.properties).length
    : 0;
  const isObject = schema.type === "object" || propertiesCount > 0;
  const isArray = schema.type === "array" && schema.items;
  const hasComplexItems =
    isArray &&
    schema.items &&
    ((schema.items as OpenAPIV3.SchemaObject).type === "object" ||
      (schema.items as OpenAPIV3.SchemaObject).properties);

  const canViewSchema = isObject || hasComplexItems;

  if (!canViewSchema) {
    return null;
  }

  // Determine which schema to use
  // If there's only one property and it's an object, use that property's schema
  const effectiveSchema =
    isObject && propertiesCount === 1
      ? schema.properties &&
        schema.properties[Object.keys(schema.properties)[0]]
      : schema;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-6 px-2 text-xs", className)}
        onClick={() => setDialogOpen(true)}
        title="View schema details"
      >
        View Schema
      </Button>

      <JsonSchemaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schema={effectiveSchema as OpenAPIV3.SchemaObject}
        name={name}
      />
    </>
  );
};
