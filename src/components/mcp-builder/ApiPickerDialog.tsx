import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ApiPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apis: any[];
  onApiSelect: (api: any) => void;
}

export function ApiPickerDialog({ open, onOpenChange, apis, onApiSelect }: ApiPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-5/6 p-0 gap-0 overflow-hidden sm:max-w-none flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">Select an API</DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Available APIs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apis.length === 0 ? (
                <div className="col-span-2 text-center p-8 border rounded-lg bg-muted/20">
                  <p className="text-lg mb-2">No APIs Available</p>
                  <p className="text-muted-foreground">
                    You can only build an MCP out of uploaded APIs. Please upload an API first.
                  </p>
                </div>
              ) : (
                apis.map((api) => (
                  <Card 
                    key={api.id} 
                    className="p-4 flex items-center gap-3 hover:bg-muted/20 cursor-pointer"
                    onClick={() => onApiSelect(api)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {api.api.info.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium">{api.api.info.title}</h3>
                      <p className="text-sm text-muted-foreground flex items-center">
                        By {api.api.info.contact?.name || "Unknown"}
                        {api.api.info.contact?.name && (
                          <BadgeCheck className="size-3 ml-1 text-blue-500" />
                        )}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
