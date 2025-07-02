import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BadgeCheck, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportApiDialog } from "@/components/ImportApiDialog";
import { OpenAPIV3 } from "openapi-types";

interface ApiPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apis: { id: string; api: OpenAPIV3.Document }[];
  onApiSelect: (api: { id: string; api: OpenAPIV3.Document }) => void;
}

export function ApiPickerDialog({
  open,
  onOpenChange,
  apis,
  onApiSelect,
}: ApiPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
          <DialogTitle className="text-xl font-semibold">
            Select an API
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-medium">Available APIs</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {apis.length === 0 ? (
                <div className="bg-muted/20 col-span-2 rounded-lg border p-8 text-center">
                  <div className="bg-primary/10 mx-auto mb-4 w-fit rounded-full p-3">
                    <Upload className="text-primary h-6 w-6" />
                  </div>
                  <p className="mb-2 text-lg">No APIs Available</p>
                  <p className="text-muted-foreground mb-6">
                    You can only build an MCP out of uploaded APIs. Please
                    upload an API first.
                  </p>
                  <ImportApiDialog preventNavigation>
                    <Button className="gap-2">
                      <Upload className="h-4 w-4" />
                      Import Your First API
                    </Button>
                  </ImportApiDialog>
                </div>
              ) : (
                apis.map((api) => (
                  <Card
                    key={api.id}
                    className="hover:bg-muted/20 flex cursor-pointer items-center gap-3 p-4"
                    onClick={() => onApiSelect(api)}
                  >
                    <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                      <span className="text-primary text-xl font-bold">
                        {api.api.info.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium">{api.api.info.title}</h3>
                      <p className="text-muted-foreground flex items-center text-sm">
                        By {api.api.info.contact?.name || "Unknown"}
                        {api.api.info.contact?.name && (
                          <BadgeCheck className="ml-1 size-3 text-blue-500" />
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
