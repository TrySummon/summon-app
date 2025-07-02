import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ToolDefinitionViewer,
  ToolDefinitionViewerItem,
} from "./ToolDefinitionViewer";

interface ToolDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ToolDefinitionViewerItem[];
  title?: string;
  description?: string;
}

export function ToolDefinitionDialog({
  open,
  onOpenChange,
  items,
  title = "Tool Definition",
  description,
}: ToolDefinitionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden sm:max-w-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <ToolDefinitionViewer
            items={items}
            title=""
            description={description}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
