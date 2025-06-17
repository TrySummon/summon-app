import React from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import CodeEditor from "@/components/CodeEditor";

interface JsonCellDisplayProps {
  data: unknown;
  maxDisplayLength?: number;
}

export const JsonCellDisplay: React.FC<JsonCellDisplayProps> = ({
  data,
  maxDisplayLength = 100,
}) => {
  const jsonString = JSON.stringify(data, null, 2);
  const isLongContent = jsonString.length > maxDisplayLength;

  const truncatedContent = isLongContent
    ? `${jsonString.slice(0, maxDisplayLength)}...`
    : jsonString;

  const displayContent =
    Array.isArray(data) && data.length === 0 ? "[]" : truncatedContent;

  if (!isLongContent && (!Array.isArray(data) || data.length <= 3)) {
    // For short content or small arrays, just display inline
    return (
      <div className="text-muted-foreground truncate font-mono text-sm">
        {displayContent}
      </div>
    );
  }

  return (
    <HoverCard openDelay={50}>
      <HoverCardTrigger asChild>
        <div className="text-muted-foreground hover:text-foreground cursor-pointer truncate font-mono text-sm transition-colors">
          {displayContent}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-2" side="top" align="start">
        <div className="rounded-md">
          <div className="max-h-64 overflow-auto">
            <CodeEditor
              defaultValue={jsonString}
              language="json"
              readOnly={true}
              height="auto"
              maxHeight={250}
              fontSize={12}
              className="border-0"
            />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
