import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Resource } from "@/types/mcp";

interface ResourceItemProps {
  resource: Resource;
  mcpId: string;
  isSelected: boolean;
  onToggle: () => void;
}

export default function ResourceItem({
  resource,
  mcpId,
  isSelected,
  onToggle,
}: ResourceItemProps) {
  const formatSize = (size?: number) => {
    if (!size) return null;
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  const sizeText = formatSize(resource.size);

  return (
    <div
      key={mcpId + resource.uri}
      className="group/resource relative border-b"
    >
      <div className="p-2 py-4">
        <div className="flex items-start justify-between">
          <div
            className="flex flex-1 cursor-pointer flex-col gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <div className="flex items-center gap-2">
              <Checkbox checked={isSelected} />
              <Label
                title={resource.name || resource.uri}
                className="text-foreground cursor-pointer truncate text-sm font-normal"
              >
                {resource.name || resource.uri}
              </Label>
            </div>
            {(resource.mimeType || sizeText) && (
              <div className="ml-6 flex items-center gap-1">
                {resource.mimeType && (
                  <span className="text-muted-foreground bg-secondary rounded px-1.5 py-0.5 text-xs">
                    {resource.mimeType}
                  </span>
                )}
                {sizeText && (
                  <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-xs">
                    {sizeText}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {resource.description && (
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <p className="text-muted-foreground/80 mt-1 ml-6 line-clamp-2 text-xs leading-relaxed">
                {resource.description}
              </p>
            </HoverCardTrigger>
            <HoverCardContent
              side="left"
              sideOffset={28}
              align="center"
              className="w-80 p-4"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  {resource.name || resource.uri}
                </h4>
                <p className="text-xs">{resource.description}</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">URI:</span>
                    <code className="bg-secondary rounded px-1 py-0.5 text-xs break-all">
                      {resource.uri}
                    </code>
                  </div>
                  {resource.mimeType && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Type:</span>
                      <span className="text-xs">{resource.mimeType}</span>
                    </div>
                  )}
                  {sizeText && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Size:</span>
                      <span className="text-xs">{sizeText}</span>
                    </div>
                  )}
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
}
