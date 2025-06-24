import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  size?: number;
}

interface ResourcesListProps {
  resources: Resource[];
}

export const ResourcesList: React.FC<ResourcesListProps> = ({ resources }) => {
  if (resources.length === 0) {
    return null;
  }

  const formatSize = (bytes?: number): string | null => {
    if (!bytes || typeof bytes !== "number") return null;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Available MCP Resources</h2>
        <p className="text-muted-foreground text-sm">
          Expand a resource to view its details and metadata
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {resources.map((resource, index) => (
          <AccordionItem key={resource.uri} value={`resource-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full flex-col items-start gap-1 text-left">
                <span className="font-medium">{resource.name}</span>
                {resource.description && (
                  <p className="text-muted-foreground text-sm font-normal">
                    {resource.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {resource.mimeType && (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground font-mono text-xs"
                    >
                      {resource.mimeType}
                    </Badge>
                  )}
                  {resource.size && (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground font-mono text-xs"
                    >
                      {formatSize(resource.size)}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <h4 className="mb-2 font-semibold">Resource Details:</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-foreground font-mono text-xs font-semibold">
                        URI:
                      </span>
                      <p className="text-muted-foreground font-mono text-xs break-all">
                        {resource.uri}
                      </p>
                    </div>

                    {resource.mimeType && (
                      <div>
                        <span className="text-foreground font-mono text-xs font-semibold">
                          MIME Type:
                        </span>
                        <p className="text-muted-foreground font-mono text-xs">
                          {resource.mimeType}
                        </p>
                      </div>
                    )}

                    {resource.size && (
                      <div>
                        <span className="text-foreground font-mono text-xs font-semibold">
                          Size:
                        </span>
                        <p className="text-muted-foreground font-mono text-xs">
                          {formatSize(resource.size)} (
                          {resource.size.toLocaleString()} bytes)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
