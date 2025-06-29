"use client";
import * as React from "react";
import { RefObject, useEffect, useRef } from "react";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { languages } from "@codemirror/language-data";
import { search, searchKeymap } from "@codemirror/search";
import { EditorState, Extension } from "@codemirror/state";
import { drawSelection, keymap, ViewUpdate } from "@codemirror/view";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "codemirror";
import { cn } from "@/utils/tailwind";

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

    const customExtensions = [
      ...(additionalExtensions || []),
      drawSelection(),
      history(),
      search(),
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
      keymap.of([...defaultKeymap, ...historyKeymap]),
      keymap.of(searchKeymap),
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
  }, [defaultValue, language, onPaste, additionalExtensions]);

  return (
    <div
      ref={editorContainerRef}
      data-testid={testId}
      className={cn("min-h-[24px] w-full overflow-y-auto", className)}
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
