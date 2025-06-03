import React from "react";
import { OpenAPIV3 } from "openapi-types";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";

interface SchemaDialogHeaderProps {
  schema: OpenAPIV3.SchemaObject;
  historyLength: number;
  name?: string;
  onGoBack?: () => void;
}

export const SchemaDialogHeader: React.FC<SchemaDialogHeaderProps> = ({
  schema,
  historyLength,
  name,
  onGoBack,
}) => {
  return (
    <DialogHeader className="border-border flex-shrink-0 border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {historyLength > 1 && onGoBack && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 flex-shrink-0 p-0"
              onClick={onGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <DialogTitle className="truncate text-lg font-semibold">
                {name || "Schema"}
              </DialogTitle>
            </div>

            <DialogDescription className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Type:</span>
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground font-mono text-xs"
              >
                {schema.type || "unknown"}
              </Badge>
            </DialogDescription>
          </div>
        </div>
      </div>

      {/* Schema description */}
      {schema.description && (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {schema.description}
          </p>
        </div>
      )}
    </DialogHeader>
  );
};
