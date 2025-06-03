import React from "react";
import { OpenAPIV3 } from "openapi-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PropertyItemProps {
  propName: string;
  propSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  isRequired: boolean;
  onNavigate: (
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    title: string,
  ) => void;
}

export const PropertyItem: React.FC<PropertyItemProps> = ({
  propName,
  propSchema,
  isRequired,
  onNavigate,
}) => {
  const isObject =
    ("type" in propSchema && propSchema.type === "object") ||
    "$ref" in propSchema;

  const isArray = "type" in propSchema && propSchema.type === "array";
  const hasArrayItemsRef =
    isArray &&
    "items" in propSchema &&
    propSchema.items &&
    ("$ref" in propSchema.items ||
      ("type" in propSchema.items && propSchema.items.type === "object"));

  const canNavigate = isObject || hasArrayItemsRef;

  return (
    <div className="border-border border-b py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="text-foreground font-mono text-sm font-semibold">
            {propName}
          </span>

          {/* Type badge */}
          {"type" in propSchema && propSchema.type && (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground font-mono text-xs"
            >
              {propSchema.type}
              {isArray &&
                "items" in propSchema &&
                propSchema.items &&
                "type" in propSchema.items &&
                `<${propSchema.items.type}>`}
            </Badge>
          )}

          {/* Required badge */}
          {isRequired && (
            <Badge
              variant="outline"
              className="border-red-500/50 bg-red-500/10 font-mono text-xs text-red-500"
            >
              required
            </Badge>
          )}
        </div>

        {/* Navigate button for objects */}
        {canNavigate && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 flex-shrink-0 px-2 text-xs"
            onClick={() => onNavigate(propSchema, propName)}
          >
            View Schema
          </Button>
        )}
      </div>

      {/* Description */}
      {"description" in propSchema && propSchema.description && (
        <div className="mt-2">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {propSchema.description}
          </p>
        </div>
      )}

      {/* Default value */}
      {"default" in propSchema && propSchema.default !== undefined && (
        <div className="mt-2">
          <Badge
            variant="outline"
            className="bg-muted text-muted-foreground font-mono text-xs"
          >
            default: {JSON.stringify(propSchema.default)}
          </Badge>
        </div>
      )}

      {/* Enum values */}
      {"enum" in propSchema && propSchema.enum && (
        <div className="text-muted-foreground mt-2 text-xs">
          <span className="font-semibold">Possible values: </span>
          {propSchema.enum.map((val, idx) => (
            <code
              key={idx}
              className="bg-muted mx-0.5 rounded-sm p-0.5 font-mono"
            >
              {JSON.stringify(val)}
            </code>
          ))}
        </div>
      )}
    </div>
  );
};
