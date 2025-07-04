import React, { useState } from "react";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { readMcpResource } from "@/ipc/mcp/mcp-client";
import { ZoomableImage } from "@/components/ZoomableImage";

interface ResourcesListProps {
  resources: Resource[];
  mcpId: string;
}

interface ResourceResponse {
  success: boolean;
  data?: {
    contents?: Array<{
      uri: string;
      mimeType?: string;
      text?: string;
      blob?: string;
    }>;
  };
  message?: string;
}

const formatFileSize = (size?: number) => {
  if (!size || typeof size !== "number") return null;

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
  const [openIndex, setOpenIndex] = useState<string>("");
  const [resourceStates, setResourceStates] = useState<
    Record<
      string,
      {
        isLoading: boolean;
        response: ResourceResponse | null;
      }
    >
  >({});

  const handleAccordionChange = async (value: string, resource: Resource) => {
    setOpenIndex(value === openIndex ? "" : value);
    if (value !== openIndex && !resourceStates[value]) {
      setResourceStates((prev) => ({
        ...prev,
        [value]: { isLoading: true, response: null },
      }));
      try {
        const result = await readMcpResource(mcpId, resource.uri);
        setResourceStates((prev) => ({
          ...prev,
          [value]: { isLoading: false, response: result as ResourceResponse },
        }));
      } catch {
        setResourceStates((prev) => ({
          ...prev,
          [value]: {
            isLoading: false,
            response: null,
          },
        }));
      }
    }
  };

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
      <Accordion
        type="single"
        collapsible
        className="w-full"
        value={openIndex}
        onValueChange={(value) => {
          const idx = typeof value === "string" ? value : "";
          const resource =
            idx !== ""
              ? resources[parseInt(idx.replace("resource-", ""))]
              : undefined;
          if (resource) handleAccordionChange(idx, resource);
          else setOpenIndex("");
        }}
      >
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
          const value = `resource-${index}`;
          const state = resourceStates[value] || {
            isLoading: false,
            response: null,
          };
          const content =
            state.response?.success && state.response.data?.contents?.[0]
              ? state.response.data.contents[0]
              : undefined;
          const isText =
            !!content?.text &&
            (content?.mimeType || mimeType || "").startsWith("text/");
          const isImage =
            !!content?.blob &&
            (content?.mimeType || mimeType || "").startsWith("image/");
          const isBinary =
            !!content?.blob &&
            !(content?.mimeType || mimeType || "").startsWith("image/");

          return (
            <AccordionItem key={uri} value={value}>
              <AccordionTrigger className="group hover:no-underline">
                <div className="flex flex-col items-start gap-1 text-left">
                  <div className="flex items-center gap-2">
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
                {state.isLoading ? null : state.response &&
                  !state.response.success ? null : isText && content?.text ? (
                  <Markdown className="max-w-full" textSize="base">
                    {String(content.text)}
                  </Markdown>
                ) : isImage && content?.blob ? (
                  <ZoomableImage
                    src={`data:${content?.mimeType || mimeType};base64,${content.blob}`}
                    alt={resource.name}
                    className="max-h-[60vh] rounded shadow"
                  />
                ) : isBinary ? (
                  <div className="text-muted-foreground py-4 text-center">
                    Binary content cannot be displayed
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};
