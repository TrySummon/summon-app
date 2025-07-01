import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ToolDefinitionViewer,
  ToolDefinitionViewerItem,
} from "@/components/ui/ToolDefinitionViewer";
import type { OptimizedResult } from "./types";

interface MergeViewProps {
  optimizedResult: OptimizedResult;
  onApprove: () => void;
  onReject: () => void;
}

export function MergeView({
  optimizedResult,
  onApprove,
  onReject,
}: MergeViewProps) {
  // Convert OptimizedResult to ToolDefinitionViewerItem[]
  const items: ToolDefinitionViewerItem[] = useMemo(
    () =>
      optimizedResult.optimised.map((optimizedTool, index) => {
        const originalTool = optimizedResult.original[index];

        return {
          name: optimizedTool.definition.name,
          original: originalTool
            ? {
                name: originalTool.definition.name,
                description: originalTool.definition.description,
                inputSchema: originalTool.definition.inputSchema,
              }
            : undefined,
          current: {
            name: optimizedTool.definition.name,
            description: optimizedTool.definition.description,
            inputSchema: optimizedTool.definition.inputSchema,
          },
        };
      }),
    [optimizedResult],
  );

  return (
    <div className="flex flex-1 flex-col">
      <ToolDefinitionViewer
        items={items}
        title="Tool Optimization Results"
        description="Review the changes and approve or reject the changes."
      />

      <div className="mt-4 flex flex-shrink-0 items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onReject} className="gap-2">
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button onClick={onApprove} className="gap-2">
            <Check className="h-4 w-4" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  );
}
