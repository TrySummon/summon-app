import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatasetItem } from "@/types/dataset";
import { formatDate } from "@/utils/formatDate";
import { UIMessage } from "ai";

interface DatasetDetailsDialogProps {
  dataset: DatasetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to get message preview text
const getMessagePreview = (message: UIMessage): string => {
  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts.filter((part) => part.type === "text");
    if (textParts.length > 0) {
      return textParts[0].text || "";
    }
  }
  return message.content || "";
};

export function DatasetDetailsDialog({
  dataset,
  open,
  onOpenChange,
}: DatasetDetailsDialogProps) {
  if (!dataset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{dataset.name}</DialogTitle>
          <DialogDescription>
            Dataset details and message preview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {formatDate(dataset.createdAt)}
            </div>
            <div>
              <span className="font-medium">Messages:</span>{" "}
              {dataset.messages.length}
            </div>
            <div>
              <span className="font-medium">Model:</span>{" "}
              {dataset.model || "None"}
            </div>
            <div>
              <span className="font-medium">System Prompt:</span>{" "}
              {dataset.systemPrompt ? "Yes" : "No"}
            </div>
          </div>

          {/* Tags */}
          {dataset.tags && dataset.tags.length > 0 && (
            <div>
              <span className="text-sm font-medium">Tags:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {dataset.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {dataset.description && (
            <div>
              <span className="text-sm font-medium">Description:</span>
              <p className="text-muted-foreground mt-1 text-sm">
                {dataset.description}
              </p>
            </div>
          )}

          {/* Message Preview */}
          <div>
            <span className="text-sm font-medium">Messages:</span>
            <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
              {dataset.messages.slice(0, 5).map((message, index) => (
                <div key={index} className="rounded border p-2 text-xs">
                  <div className="font-medium capitalize">{message.role}</div>
                  <div className="text-muted-foreground mt-1 line-clamp-2">
                    {getMessagePreview(message)}
                  </div>
                </div>
              ))}
              {dataset.messages.length > 5 && (
                <p className="text-muted-foreground text-center text-xs">
                  ... and {dataset.messages.length - 5} more messages
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
