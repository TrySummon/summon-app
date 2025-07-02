import React from "react";
import { Button } from "@/components/ui/button";

interface DialogFooterProps {
  selectedCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DialogFooter({
  selectedCount,
  onCancel,
  onConfirm,
}: DialogFooterProps) {
  return (
    <div className="flex flex-shrink-0 items-center justify-between border-t p-6">
      <div className="text-muted-foreground text-sm">
        {selectedCount > 0 && (
          <span>
            {selectedCount} endpoint{selectedCount !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={selectedCount === 0}>
          Add
        </Button>
      </div>
    </div>
  );
}
