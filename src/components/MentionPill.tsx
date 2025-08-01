import React from "react";
import {
  FileText,
  Image,
  X,
  Wrench,
  Server,
  Database,
  Dot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";
import { Button } from "./ui/button";
import McpIcon from "./icons/mcp";

export interface MentionPillProps {
  text: string;
  type: "image" | "file" | "tool" | "api" | "mcp" | "dataset" | "dataset-item";
  onDelete?: () => void;
  className?: string;
}

// Utility function to determine MentionPill type from contentType
export function getFileTypeFromContentType(contentType?: string) {
  if (contentType === "application/x-summon-api") return "api";
  if (contentType === "application/x-summon-dataset") return "dataset";
  if (contentType === "application/x-summon-dataset-item")
    return "dataset-item";

  if (contentType?.startsWith("image/")) return "image";
  return "file";
}

const typeConfig = {
  image: {
    icon: Image,
  },
  api: {
    icon: Server,
  },
  file: {
    icon: FileText,
  },
  tool: {
    icon: Wrench,
  },
  dataset: {
    icon: Database,
  },
  mcp: {
    icon: McpIcon,
  },
  "dataset-item": {
    icon: Dot,
  },
};

export function MentionPill({
  text,
  type,
  onDelete,
  className,
}: MentionPillProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  text = text.startsWith("@") ? text.slice(1) : text;
  text = text.startsWith(`${type}:`) ? text.slice(type.length + 1) : text;

  return (
    <Badge
      variant="outline"
      className={cn(
        "group/mention-pill inline-flex max-w-[150px] items-center gap-1.5",
        className,
      )}
    >
      <div className="relative flex h-3 w-3 items-center justify-center">
        <Icon
          className={cn(
            "h-3 w-3 transition-opacity",
            onDelete && "group-hover/mention-pill:opacity-0",
          )}
        />
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute inset-0 h-3 w-3 p-0 opacity-0 transition-opacity group-hover/mention-pill:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <span className="truncate">{text}</span>
    </Badge>
  );
}
