import React from "react";
import { OpenAPIV3 } from "openapi-types";
import { Badge } from "@/components/ui/badge";

interface PrimitiveTypeProps {
  schema: OpenAPIV3.SchemaObject;
}

export const PrimitiveType: React.FC<PrimitiveTypeProps> = ({ schema }) => {
  return (
    <div className="space-y-4">
      {/* Description */}
      {"description" in schema && schema.description && (
        <div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {schema.description}
          </p>
        </div>
      )}

      {/* Schema details */}
      <div className="space-y-3">
        {/* Format */}
        {"format" in schema && schema.format && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              Format:
            </span>
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground font-mono text-xs"
            >
              {schema.format}
            </Badge>
          </div>
        )}

        {/* Default value */}
        {"default" in schema && schema.default !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              Default:
            </span>
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground font-mono text-xs"
            >
              {JSON.stringify(schema.default)}
            </Badge>
          </div>
        )}

        {/* Enum values */}
        {"enum" in schema && schema.enum && (
          <div>
            <span className="text-muted-foreground mb-2 block text-sm font-medium">
              Possible values:
            </span>
            <div className="flex flex-wrap gap-1">
              {schema.enum.map((val, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {JSON.stringify(val)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Minimum/Maximum for numbers */}
        {schema.type === "number" || schema.type === "integer" ? (
          <div className="space-y-2">
            {"minimum" in schema && schema.minimum !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Minimum:
                </span>
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {schema.minimum}
                </Badge>
              </div>
            )}
            {"maximum" in schema && schema.maximum !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Maximum:
                </span>
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {schema.maximum}
                </Badge>
              </div>
            )}
          </div>
        ) : null}

        {/* String length constraints */}
        {schema.type === "string" ? (
          <div className="space-y-2">
            {"minLength" in schema && schema.minLength !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Min Length:
                </span>
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {schema.minLength}
                </Badge>
              </div>
            )}
            {"maxLength" in schema && schema.maxLength !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Max Length:
                </span>
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {schema.maxLength}
                </Badge>
              </div>
            )}
            {"pattern" in schema && schema.pattern && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  Pattern:
                </span>
                <Badge
                  variant="outline"
                  className="bg-muted text-muted-foreground font-mono text-xs"
                >
                  {schema.pattern}
                </Badge>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
