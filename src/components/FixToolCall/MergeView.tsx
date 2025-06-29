import React, { useState, useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MergeView as CodeMirrorMergeView } from "@codemirror/merge";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
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
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(
    optimizedResult.optimised[0]?.definition.name,
  );
  // This ref now points to a single, stable div
  const mergeViewContainerRef = useRef<HTMLDivElement>(null);
  const mergeViewInstanceRef = useRef<CodeMirrorMergeView | null>(null);

  // This effect now correctly handles creating/destroying the editor
  // inside a stable container.
  useEffect(() => {
    // Always clean up the previous instance first
    if (mergeViewInstanceRef.current) {
      mergeViewInstanceRef.current.destroy();
      mergeViewInstanceRef.current = null;
    }

    // Ensure the container, data, and selected tab are ready
    if (optimizedResult && mergeViewContainerRef.current && selectedToolName) {
      const isDarkTheme = document.documentElement.classList.contains("dark");
      const theme = isDarkTheme ? vscodeDark : vscodeLight;

      const toolIndex = optimizedResult.optimised.findIndex(
        (tool) => tool.definition.name === selectedToolName,
      );

      if (toolIndex === -1) return;

      const originalDefinition =
        optimizedResult.original[toolIndex]?.definition;
      const optimizedDefinition =
        optimizedResult.optimised[toolIndex]?.definition;

      if (!originalDefinition || !optimizedDefinition) return;

      const originalJson = JSON.stringify(originalDefinition, null, 2);
      const optimizedJson = JSON.stringify(optimizedDefinition, null, 2);

      // Clear the stable container before creating a new view inside it.
      // This is crucial because we are reusing the same div.
      mergeViewContainerRef.current.innerHTML = "";

      const mergeView = new CodeMirrorMergeView({
        collapseUnchanged: {
          margin: 3,
          minSize: 4,
        },
        a: {
          doc: originalJson,
          extensions: [
            json(),
            theme,
            EditorView.theme({
              "&": { fontSize: "14px" },
              ".cm-content": { fontFamily: "var(--font-mono)" },
            }),
            EditorState.readOnly.of(true),
          ],
        },
        b: {
          doc: optimizedJson,
          extensions: [
            json(),
            theme,
            EditorView.theme({
              "&": { fontSize: "14px" },
              ".cm-content": { fontFamily: "var(--font-mono)" },
            }),
            EditorState.readOnly.of(true),
          ],
        },
        parent: mergeViewContainerRef.current,
      });

      mergeViewInstanceRef.current = mergeView;
    }

    // The cleanup function for the entire component will also destroy the instance
    return () => {
      if (mergeViewInstanceRef.current) {
        mergeViewInstanceRef.current.destroy();
        mergeViewInstanceRef.current = null;
      }
    };
  }, [optimizedResult, selectedToolName]); // Dependency array is correct

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">Tool Optimization Results</h3>
        <p className="text-muted-foreground text-sm">
          Review the changes and approve or reject the changes.
        </p>
      </div>

      <Tabs
        value={selectedToolName}
        onValueChange={setSelectedToolName}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex flex-shrink-0 items-center justify-between">
          <TabsList className="w-fit">
            {optimizedResult.optimised.map((tool, index) => (
              <TabsTrigger key={index} value={tool.definition.name}>
                {tool.definition.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="ml-4 flex items-center gap-2 text-sm">
            <span className="font-medium text-red-600 dark:text-red-400">
              Original
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              Optimized
            </span>
          </div>
        </div>
        <div className="flex h-0 flex-grow overflow-y-auto rounded-lg border">
          <div ref={mergeViewContainerRef} className="h-full w-full" />
        </div>
      </Tabs>

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
