"use client";
import * as React from "react";
import { RefObject, useEffect, useRef, useMemo } from "react";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { languages } from "@codemirror/language-data";
import { EditorState } from "@codemirror/state";
import { drawSelection, keymap } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "codemirror";
import { cn } from "@/utils/tailwind";
import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import {
  autocompletion,
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";

// Mention-related interfaces and types
export interface MentionData {
  id: string;
  name: string;
  type: "tool" | "api" | "file";
  mcpId?: string;
  apiId?: string;
}

export interface ExtractedMention {
  text: string;
  name: string;
  type: "image" | "file" | "tool" | "api";
  mcpId?: string;
  apiId?: string;
}

// Utility to extract unique mentions from the message
export function extractMentions(
  text: string,
  mentionData: MentionData[],
): ExtractedMention[] {
  if (mentionData.length === 0) {
    return [];
  }
  // Create a regex that specifically matches the known mention names.
  // Sort by length descending to ensure longer matches are tried first
  // (prevents shorter substrings from matching when longer options exist)
  const mentionNames = mentionData
    .map((item) => ({
      name: item.name,
      escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
    }))
    .sort((a, b) => b.name.length - a.name.length)
    .map((item) => item.escaped);
  const mentionRegex = new RegExp(`@(${mentionNames.join("|")})`, "g");

  const mentionSet = new Set<string>();
  let match;
  // By creating a new RegExp object, we ensure the search starts from the beginning of the string every time.
  const regex = new RegExp(mentionRegex);
  while ((match = regex.exec(text))) {
    mentionSet.add(match[1]); // `match[1]` is the captured group (the name)
  }

  return Array.from(mentionSet).map((name) => {
    const data = mentionData.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    return {
      text: `@${name}`,
      name,
      type: data?.type || "tool",
      mcpId: data?.mcpId,
      apiId: data?.apiId,
    };
  });
}

// Create mention regex
function createMentionRegex(mentionData: MentionData[]): RegExp | null {
  if (mentionData.length === 0) {
    return null;
  }
  // Sort by length descending to ensure longer matches are tried first
  const mentionNames = mentionData
    .map((item) => ({
      name: item.name,
      escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
    }))
    .sort((a, b) => b.name.length - a.name.length)
    .map((item) => item.escaped);
  return new RegExp(`@(${mentionNames.join("|")})`, "g");
}

// Autocomplete extension for mentions
function createMentionAutocompletion(mentionData: MentionData[]): Extension {
  return autocompletion({
    icons: false,
    maxRenderedOptions: 20,
    optionClass: () => "custom-autocomplete-option",
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/@[\w\s]*/);
        if (!match || (match.from === match.to && !context.explicit)) {
          return null;
        }

        // Group mentions by type
        const groupedMentions = mentionData.reduce(
          (acc, item) => {
            const category =
              item.type === "api"
                ? "APIs"
                : item.type === "tool"
                  ? "Tools"
                  : "Other";

            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(item);
            return acc;
          },
          {} as Record<string, typeof mentionData>,
        );

        // Create options with sections
        const options: Completion[] = [];

        // Add APIs first
        if (groupedMentions.APIs) {
          options.push(
            ...groupedMentions.APIs.map((item) => ({
              label: `@${item.name}`,
              displayLabel: item.name,
              type: "variable",
              apply: `@${item.name} `,
              detail: "API",
              boost: 100,
            })),
          );
        }

        // Then add Tools
        if (groupedMentions.Tools) {
          options.push(
            ...groupedMentions.Tools.map((item) => ({
              label: `@${item.name}`,
              displayLabel: item.name,
              type: "variable",
              apply: `@${item.name} `,
              detail: "Tool",
              boost: 50,
            })),
          );
        }

        // Finally add Other category if it exists
        if (groupedMentions.Other) {
          options.push(
            ...groupedMentions.Other.map((item) => ({
              label: `@${item.name}`,
              type: "variable",
              apply: `@${item.name} `,
              detail: "Other",
              boost: 10,
            })),
          );
        }

        return {
          from: match.from,
          options,
        };
      },
    ],
  });
}

// Create mention decoration plugin
function createMentionDecorationPlugin(mentionRegex: RegExp | null): Extension {
  const buildMentionDecorations = (view: EditorView) => {
    const builder = new RangeSetBuilder<Decoration>();
    if (!mentionRegex) {
      return builder.finish();
    }
    // By creating a new RegExp object, we ensure the search starts from the beginning of the string every time.
    const regex = new RegExp(mentionRegex);

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;
      while ((match = regex.exec(text))) {
        const start = from + match.index;
        const end = start + match[0].length;
        builder.add(
          start,
          end,
          Decoration.mark({
            class: "bg-muted text-primary font-semibold rounded-sm px-0.5",
          }),
        );
      }
    }
    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations;

      constructor(view: EditorView) {
        this.decorations = buildMentionDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildMentionDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

// Create backspace handler for mentions
function createMentionBackspaceHandler(
  mentionData: MentionData[],
  mentionRegex: RegExp | null,
) {
  return (view: EditorView): boolean => {
    if (!mentionRegex) return false;
    const { state } = view;
    const { selection } = state;
    if (!selection.main.empty) {
      return false; // Let default behavior handle selection deletion
    }

    const pos = selection.main.head;
    // Check for a mention immediately before the cursor
    const textBefore = state.doc.sliceString(Math.max(0, pos - 50), pos);
    // We use a non-global regex here to match only the end of the string
    // Sort by length descending to ensure longer matches are tried first
    const sortedMentionNames = mentionData
      .map((item) => ({
        name: item.name,
        escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
      }))
      .sort((a, b) => b.name.length - a.name.length)
      .map((item) => item.escaped);
    const currentMentionRegex = new RegExp(
      `@(${sortedMentionNames.join("|")})$`,
    );
    const match = textBefore.match(currentMentionRegex);

    if (match) {
      const fullMatch = match[0];
      // If it's a valid mention, delete the whole thing
      const from = pos - fullMatch.length;
      const to = pos;
      view.dispatch({
        changes: { from, to, insert: "" },
      });
      return true; // Mark as handled
    }
    return false; // Not a mention, use default backspace behavior
  };
}

const getLanguageExtension = (language?: string) => {
  switch (language?.toLowerCase()) {
    case "javascript":
    case "js":
    case "typescript":
    case "ts":
      return javascript({ typescript: true });
    case "json":
      return json();
    case "yaml":
      return yaml();
    case "html":
      return html();
    case "css":
      return css();
    case "python":
      return python();
    default:
      return markdown({
        codeLanguages: languages,
        addKeymap: true,
      });
  }
};

interface Props {
  className?: string;
  editorRef?: RefObject<EditorView | null>;
  defaultValue?: string;
  value?: string;
  height?: string | number;
  maxHeight?: string | number;
  fontSize?: number;
  language?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  overflowHidden?: boolean;
  testId?: string;
  additionalExtensions?: Extension[];
  regularFont?: boolean;
  mentionData?: MentionData[];
  onChange?: (value: string) => void;
  onFocusChange?: (focused: boolean, viewUpdate: ViewUpdate) => void;
  onMount?: (view: EditorView) => void;
  onPaste?: (event: ClipboardEvent) => void;
}

function CodeMirrorEditor({
  className,
  editorRef,
  defaultValue,
  value,
  height,
  maxHeight,
  fontSize,
  language,
  readOnly,
  autoFocus,
  testId,
  overflowHidden,
  additionalExtensions,
  regularFont,
  mentionData,
  onChange,
  onFocusChange,
  onMount,
  onPaste,
}: Props) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const internalEditorRef = useRef<EditorView | null>(null);

  const isDarkTheme = React.useMemo(() => {
    return document.documentElement.classList.contains("dark");
  }, []);

  // Use provided ref or internal ref
  const actualEditorRef = editorRef || internalEditorRef;

  // Mention-related memoized values (only if mentionData is provided)
  const mentionRegex = useMemo(
    () => (mentionData ? createMentionRegex(mentionData) : null),
    [mentionData],
  );

  const mentionAutocompletion = useMemo(
    () => (mentionData ? createMentionAutocompletion(mentionData) : null),
    [mentionData],
  );

  const mentionDecorationPlugin = useMemo(
    () => (mentionRegex ? createMentionDecorationPlugin(mentionRegex) : null),
    [mentionRegex],
  );

  const mentionBackspaceHandler = useMemo(
    () =>
      mentionData && mentionRegex
        ? createMentionBackspaceHandler(mentionData, mentionRegex)
        : null,
    [mentionData, mentionRegex],
  );

  function focusAtEndOfContent(editor: EditorView) {
    const doc = editor.state.doc;
    const endPos = doc.length;
    editor.dispatch({
      selection: { anchor: endPos, head: endPos },
    });
    editor.focus();
  }

  useEffect(() => {
    if (
      value !== undefined &&
      actualEditorRef.current &&
      value !== actualEditorRef.current.state.doc.toString()
    ) {
      actualEditorRef.current.dispatch({
        changes: {
          from: 0,
          to: actualEditorRef.current.state.doc.length,
          insert: value,
        },
      });
    }
  }, [value, actualEditorRef]);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    if (onPaste && editorContainerRef.current) {
      editorContainerRef.current.addEventListener("paste", onPaste);
    }

    const editorTheme = EditorView.theme({
      "&": {
        fontSize: `${fontSize || 14}px`,
        fontFamily: regularFont ? "var(--font-sans)" : "var(--font-mono)",
        height: "100%",
        backgroundColor: "transparent",
      },
      ".cm-content": {
        fontFamily: regularFont ? "var(--font-sans)" : "var(--font-mono)",
      },
      ".cm-scroller": {
        overflow: overflowHidden ? "hidden" : "auto",
      },
      "&.cm-focused": {
        outline: "none",
      },
      ".cm-cursor": {
        borderLeftColor: "hsl(var(--foreground))",
      },
      ".cm-line": {
        padding: "0",
        color: "hsl(var(--foreground))",
      },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          background: "hsl(var(--accent))",
        },
      // Custom mention menu styling - Shadcn-inspired
      ".cm-tooltip-autocomplete": {
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "6px",
        boxShadow:
          "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        maxHeight: "400px !important",
        minWidth: "240px",
        fontFamily: "var(--font-sans)",
        fontSize: "14px",
        padding: "0",
        overflow: "hidden",
      },
      ".cm-tooltip-autocomplete ul": {
        margin: "0",
        padding: "6px",
        maxHeight: "380px !important",
        overflowY: "auto",
        listStyle: "none",
      },
      ".cm-tooltip-autocomplete li": {
        margin: "0 0 2px 0",
        padding: "10px 12px",
        borderRadius: "5px",
        cursor: "pointer",
        color: "hsl(var(--foreground))",
        fontSize: "14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        transition: "all 0.15s ease",
        lineHeight: "1.4",
        minHeight: "36px",
        position: "relative",
      },
      ".cm-tooltip-autocomplete li[aria-selected]": {
        background: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
        transform: "translateY(-1px)",
        boxShadow: "0 2px 4px -1px rgb(0 0 0 / 0.1)",
      },
      ".cm-tooltip-autocomplete li:hover": {
        background: "hsl(var(--muted))",
        color: "hsl(var(--foreground))",
        transform: "translateY(-1px)",
        boxShadow: "0 2px 4px -1px rgb(0 0 0 / 0.1)",
      },
      ".cm-tooltip-autocomplete li .cm-completionLabel": {
        fontWeight: "500",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        flex: "1",
      },
      ".cm-tooltip-autocomplete li .cm-completionDetail": {
        color: "hsl(var(--muted-foreground))",
        fontSize: "11px",
        fontWeight: "normal",
        marginLeft: "auto",
        padding: "2px 6px",
        background: "hsl(var(--muted))",
        borderRadius: "3px",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      },
      ".cm-tooltip-autocomplete li[aria-selected] .cm-completionDetail": {
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
      },
      ".cm-tooltip-autocomplete li:hover .cm-completionDetail": {
        background: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
      },
      // Hide the type icons
      ".cm-tooltip-autocomplete li::before": {
        display: "none !important",
      },
    });

    const themeExtension = isDarkTheme ? vscodeDark : vscodeLight;

    // Build mention extensions if mentionData is provided
    const mentionExtensions = [];
    if (mentionAutocompletion) {
      mentionExtensions.push(mentionAutocompletion);
    }
    if (mentionDecorationPlugin) {
      mentionExtensions.push(mentionDecorationPlugin);
    }

    // Build keymap extensions including mention backspace handler
    const keymapExtensions = [];

    // Add custom backspace handler FIRST so it gets priority
    if (mentionBackspaceHandler) {
      keymapExtensions.push({
        key: "Backspace",
        run: mentionBackspaceHandler,
      });
    }

    // Then add default keymaps
    keymapExtensions.push(...defaultKeymap, ...historyKeymap);

    const customExtensions = [
      ...(additionalExtensions || []),
      ...mentionExtensions,
      drawSelection(),
      history(),
      EditorView.lineWrapping,
      EditorView.updateListener.of((viewUpdate) => {
        if (viewUpdate.docChanged) {
          const value = viewUpdate.state.doc.toString();
          onChange?.(value);
        }
        if (viewUpdate.focusChanged) {
          onFocusChange?.(viewUpdate.view.hasFocus, viewUpdate);
        }
      }),
      editorTheme,
      themeExtension,
      getLanguageExtension(language),
      EditorState.readOnly.of(!!readOnly),
      keymap.of(keymapExtensions),
    ];

    // Initialize CodeMirror with extensions
    const startState = EditorState.create({
      doc: defaultValue,
      extensions: customExtensions,
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorContainerRef.current,
    });

    // eslint-disable-next-line react-compiler/react-compiler
    actualEditorRef.current = view;

    onMount?.(view);

    if (autoFocus) {
      setTimeout(() => focusAtEndOfContent(view), 0);
    }

    return () => {
      // Clean up paste event listener
      if (onPaste && editorContainerRef.current) {
        editorContainerRef.current.removeEventListener("paste", onPaste);
      }
      view.destroy();
      actualEditorRef.current = null;
    };
  }, [
    language,
    onPaste,
    additionalExtensions,
    mentionAutocompletion,
    mentionDecorationPlugin,
    mentionBackspaceHandler,
  ]);

  return (
    <div
      ref={editorContainerRef}
      data-testid={testId}
      className={cn("min-h-[24px] w-full", className)}
      style={{
        height: height
          ? typeof height === "string"
            ? height
            : `${height}px`
          : undefined,
        maxHeight: maxHeight
          ? typeof maxHeight === "string"
            ? maxHeight
            : `${maxHeight}px`
          : undefined,
      }}
    />
  );
}

export default React.memo(CodeMirrorEditor);
