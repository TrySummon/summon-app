import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MergeView as CodeMirrorMergeView } from "@codemirror/merge";
import { EditorView } from "codemirror";
import { EditorState } from "@codemirror/state";
import { json } from "@codemirror/lang-json";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";

export interface ToolDefinitionData {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface ToolDefinitionViewerItem {
  name: string;
  original?: ToolDefinitionData;
  current: ToolDefinitionData;
}

interface ToolDefinitionViewerProps {
  items: ToolDefinitionViewerItem[];
  title?: string;
  description?: string;
  className?: string;
}

export function ToolDefinitionViewer({
  items,
  title = "Tool Definition",
  description,
  className,
}: ToolDefinitionViewerProps) {
  const [selectedToolName, setSelectedToolName] = useState<string | undefined>(
    items[0]?.name,
  );
  const mergeViewContainerRef = useRef<HTMLDivElement>(null);
  const mergeViewInstanceRef = useRef<{ destroy: () => void } | null>(null);
  useEffect(() => {
    // Always clean up the previous instance first
    if (mergeViewInstanceRef.current) {
      mergeViewInstanceRef.current.destroy();
      mergeViewInstanceRef.current = null;
    }

    // Ensure the container, data, and selected tab are ready
    if (items.length > 0 && mergeViewContainerRef.current && selectedToolName) {
      const isDarkTheme = document.documentElement.classList.contains("dark");
      const theme = isDarkTheme ? vscodeDark : vscodeLight;

      const selectedItem = items.find((item) => item.name === selectedToolName);
      if (!selectedItem) return;

      const currentJson = JSON.stringify(selectedItem.current, null, 2);

      // Clear the stable container before creating a new view inside it
      mergeViewContainerRef.current.innerHTML = "";

      // If we have an original definition, show diff view
      if (selectedItem.original) {
        const originalJson = JSON.stringify(selectedItem.original, null, 2);

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
                "&": {
                  fontSize: "14px",
                  height: "100%",
                  backgroundColor: "transparent",
                },
                ".cm-content": {
                  fontFamily: "var(--font-mono)",
                  padding: "12px",
                },
                ".cm-scroller": {
                  overflow: "auto",
                },
                "&.cm-focused": {
                  outline: "none",
                },
              }),
              EditorState.readOnly.of(true),
            ],
          },
          b: {
            doc: currentJson,
            extensions: [
              json(),
              theme,
              EditorView.theme({
                "&": {
                  fontSize: "14px",
                  height: "100%",
                  backgroundColor: "transparent",
                },
                ".cm-content": {
                  fontFamily: "var(--font-mono)",
                  padding: "12px",
                },
                ".cm-scroller": {
                  overflow: "auto",
                },
                "&.cm-focused": {
                  outline: "none",
                },
              }),
              EditorState.readOnly.of(true),
            ],
          },
          parent: mergeViewContainerRef.current,
        });

        mergeViewInstanceRef.current = mergeView;
      } else {
        // Just show the current definition in a single editor
        const editorView = new EditorView({
          state: EditorState.create({
            doc: currentJson,
            extensions: [
              json(),
              theme,
              EditorView.theme({
                "&": {
                  fontSize: "14px",
                  height: "100%",
                  backgroundColor: "transparent",
                },
                ".cm-content": {
                  fontFamily: "var(--font-mono)",
                  padding: "12px",
                },
                ".cm-scroller": {
                  overflow: "auto",
                },
                "&.cm-focused": {
                  outline: "none",
                },
              }),
              EditorState.readOnly.of(true),
            ],
          }),
          parent: mergeViewContainerRef.current,
        });

        // Store the view so we can destroy it later
        mergeViewInstanceRef.current = { destroy: () => editorView.destroy() };
      }
    }

    return () => {
      if (mergeViewInstanceRef.current) {
        mergeViewInstanceRef.current.destroy();
        mergeViewInstanceRef.current = null;
      }
    };
  }, [items, selectedToolName]);

  const selectedItem = items.find((item) => item.name === selectedToolName);
  const hasOriginal = selectedItem?.original;

  return (
    <div className={`flex flex-1 flex-col ${className || ""}`}>
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      {items.length > 1 ? (
        <Tabs
          value={selectedToolName}
          onValueChange={setSelectedToolName}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex flex-shrink-0 items-center justify-between">
            <TabsList className="w-fit">
              {items.map((item) => (
                <TabsTrigger key={item.name} value={item.name}>
                  {item.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {hasOriginal && (
              <div className="ml-4 flex items-center gap-2 text-sm">
                <span className="font-medium text-red-600 dark:text-red-400">
                  Original
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Current
                </span>
              </div>
            )}
          </div>
          <div className="flex h-0 min-h-[400px] flex-grow overflow-y-auto rounded-lg border">
            <div ref={mergeViewContainerRef} className="h-full w-full" />
          </div>
        </Tabs>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {hasOriginal && (
            <div className="mb-2 flex flex-shrink-0 items-center justify-end">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-red-600 dark:text-red-400">
                  Original
                </span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Current
                </span>
              </div>
            </div>
          )}
          <div className="flex min-h-[400px] flex-grow overflow-y-auto rounded-lg border">
            <div ref={mergeViewContainerRef} className="h-full w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
