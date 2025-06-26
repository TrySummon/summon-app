import React from "react";
import { Resource } from "@modelcontextprotocol/sdk/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Database, Image } from "lucide-react";

interface ResourcesListProps {
  resources: Resource[];
}

const getResourceIcon = (mimeType?: string) => {
  if (!mimeType) return <FileText className="h-4 w-4" />;

  if (mimeType.startsWith("image/")) {
    return <Image className="h-4 w-4" />;
  }

  if (mimeType.includes("json") || mimeType.includes("xml")) {
    return <Database className="h-4 w-4" />;
  }

  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const ResourcesList: React.FC<ResourcesListProps> = ({ resources }) => {
  if (resources.length === 0) {
    return (
      <div className="w-full py-6 text-center">
        <p className="mb-1 text-sm font-medium">This MCP has no resources.</p>
        <p className="text-muted-foreground text-xs">
          Resources are data and content exposed by the MCP server (files,
          database records, API responses, etc.)
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          MCP Resources ({resources.length})
        </h2>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {resources.map((resource, index) => (
          <AccordionItem key={resource.uri} value={`resource-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-col items-start gap-1 text-left">
                <div className="flex items-center gap-2">
                  {getResourceIcon(resource.mimeType)}
                  <span className="font-medium">{resource.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(resource.uri);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                {resource.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm font-normal">
                    {resource.description}
                  </p>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 rounded-md border p-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-foreground font-mono text-xs font-semibold">
                      URI
                    </span>
                  </div>
                  <code className="text-muted-foreground bg-muted block rounded p-2 text-xs">
                    {resource.uri}
                  </code>
                </div>

                {resource.mimeType && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-foreground font-mono text-xs font-semibold">
                        MIME Type
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground font-mono text-xs"
                      >
                        {resource.mimeType}
                      </Badge>
                    </div>
                  </div>
                )}

                {resource.size && typeof resource.size === "number" && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-foreground font-mono text-xs font-semibold">
                        Size
                      </span>
                      <Badge
                        variant="outline"
                        className="bg-muted text-muted-foreground font-mono text-xs"
                      >
                        {formatFileSize(resource.size as number)}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
