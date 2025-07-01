import React, { useState } from "react";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Image, File } from "lucide-react";
import { ViewResourceDialog } from "./ViewResourceDialog";

interface ResourcesListProps {
  resources: Resource[];
  mcpId: string;
}

const getResourceIcon = (mimeType?: string): React.ReactNode => {
  if (!mimeType) return <File className="h-4 w-4" />;
  
  if (mimeType.startsWith("text/")) {
    return <FileText className="h-4 w-4" />;
  }
  
  if (mimeType.startsWith("image/")) {
    return <Image className="h-4 w-4" />;
  }
  
  return <File className="h-4 w-4" />;
};

const formatFileSize = (size?: number) => {
  if (!size || typeof size !== 'number') return null;
  
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let fileSize = size;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
};

export const ResourcesList: React.FC<ResourcesListProps> = ({
  resources,
  mcpId,
}) => {
  const [viewResourceDialogOpen, setViewResourceDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  if (resources.length === 0) {
    return (
      <div className="w-full py-6 text-center">
        <p className="mb-1 text-sm font-medium">This MCP has no resources.</p>
        <p className="text-muted-foreground text-xs">
          Resources are data and content that can be exposed to LLMs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {resources.map((resource, index) => {
          const uri = String(resource.uri);
          const name = String(resource.name);
          const description =
            resource.description && typeof resource.description === "string"
              ? resource.description
              : "";
          const mimeType =
            resource.mimeType && typeof resource.mimeType === "string"
              ? resource.mimeType
              : undefined;
          const size =
            resource.size && typeof resource.size === "number"
              ? resource.size
              : undefined;

          return (
            <AccordionItem key={uri} value={`resource-${index}`}>
              <AccordionTrigger className="group hover:no-underline">
                <div className="flex flex-col items-start gap-1 text-left">
                  <div className="flex items-center gap-2">
                    {getResourceIcon(mimeType)}
                    <span className="font-medium">{name}</span>
                    {mimeType && (
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground font-mono text-xs"
                      >
                        {mimeType}
                      </Badge>
                    )}
                    {size && (
                      <span className="text-muted-foreground font-mono text-xs">
                        {formatFileSize(size)}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResource(resource);
                          setViewResourceDialogOpen(true);
                        }}
                        title="View resource"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm font-normal">
                      {description}
                    </p>
                  )}
                  <p className="text-muted-foreground font-mono text-xs">
                    {uri}
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 rounded-md border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-mono text-xs font-semibold">
                        URI
                      </span>
                    </div>
                    <p className="text-muted-foreground font-mono text-xs break-all">
                      {uri}
                    </p>
                  </div>

                  {mimeType && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono text-xs font-semibold">
                          MIME Type
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-xs">
                        {mimeType}
                      </p>
                    </div>
                  )}

                  {size && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono text-xs font-semibold">
                          Size
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-xs">
                        {formatFileSize(size)} ({size.toLocaleString()} bytes)
                      </p>
                    </div>
                  )}

                  {description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-mono text-xs font-semibold">
                          Description
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {description}
                      </p>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <ViewResourceDialog
        resource={selectedResource}
        mcpId={mcpId}
        open={viewResourceDialogOpen}
        onOpenChange={setViewResourceDialogOpen}
      />
    </div>
  );
}; 