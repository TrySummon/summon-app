import React from "react";
import { Markdown } from "../Markdown";
import { Badge } from "../ui/badge";

interface EndpointHeaderProps {
  tags?: string[];
  summary: string;
  description?: string;
}

export const EndpointHeader: React.FC<EndpointHeaderProps> = ({
  tags,
  summary,
  description,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {tags && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index}>{tag}</Badge>
          ))}
        </div>
      )}
      <h1 className="text-lg font-bold tracking-tight xl:text-xl">{summary}</h1>
      {description && (
        <Markdown className="text-muted-foreground text-sm">
          {description}
        </Markdown>
      )}
    </div>
  );
};
