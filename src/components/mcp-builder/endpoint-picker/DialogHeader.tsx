import React from "react";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, BadgeCheck } from "lucide-react";
import { OpenAPIV3 } from "openapi-types";

interface DialogHeaderProps {
  api: {
    id: string;
    api: OpenAPIV3.Document;
  };
  onBackClick?: () => void;
  onClose: () => void;
}

export function DialogHeader({ api, onBackClick, onClose }: DialogHeaderProps) {
  return (
    <div className="flex flex-shrink-0 items-center border-b px-2 py-3">
      <Button
        variant="ghost"
        size="icon"
        className="mr-2"
        onClick={() => {
          if (onBackClick) {
            onBackClick();
          }
          onClose();
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center">
        <div className="bg-primary/10 mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
          <span className="text-primary text-lg font-bold">
            {api?.api?.info?.title?.charAt(0).toUpperCase() || "A"}
          </span>
        </div>
        <div>
          <DialogTitle className="text-lg">{api?.api?.info?.title}</DialogTitle>
          <div className="text-muted-foreground flex items-center text-sm">
            By {api?.api?.info?.contact?.name || "Unknown"}
            {api?.api?.info?.contact?.name && (
              <BadgeCheck className="ml-1 size-3 text-blue-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
