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

// Custom MCP Icon component
const McpIcon = ({ className }: { className?: string }) => (
  <svg
    fill="currentColor"
    fillRule="evenodd"
    height="1em"
    style={{ flex: "none", lineHeight: 1 }}
    viewBox="0 0 24 24"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <title>ModelContextProtocol</title>
    <path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z"></path>
    <path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z"></path>
  </svg>
);

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
