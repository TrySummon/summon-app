import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "./button";

interface PayloadDialogProps {
  title: string;
  payload: unknown;
  triggerText?: string;
}

export const PayloadDialog: React.FC<PayloadDialogProps> = ({
  title,
  payload,
  triggerText,
}) => {
  const isObject = typeof payload === "object" && payload !== null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          {triggerText || "View"}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden p-6 pt-0">
          <div className="h-full overflow-auto rounded-md">
            {isObject ? (
              <CodeSnippet language="json">
                {JSON.stringify(payload, null, 2)}
              </CodeSnippet>
            ) : (
              <div className="bg-muted h-full overflow-auto rounded-md p-4 font-mono text-sm whitespace-pre-wrap">
                {String(payload)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
