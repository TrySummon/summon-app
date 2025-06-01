"use client";
import * as React from "react"
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
  height?: string | number;
  maxHeight?: string | number;
  fontSize?: number;
  language?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  overflowHidden?: boolean;
  testId?: string;
  additionalExtensions?: Extension[];
  onChange?: (value: string) => void;
  onFocusChange?: (focused: boolean, viewUpdate: ViewUpdate) => void;
  onMount?: (view: EditorView) => void;
  onPaste?: (event: ClipboardEvent) => void;
}

 function CodeMirrorEditor({
  className,
  editorRef,
  defaultValue,
  height,
  maxHeight,
  fontSize,
  language,
  readOnly,
  autoFocus,
  testId,
  overflowHidden,
  additionalExtensions,
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
    if (!editorContainerRef.current) return;
    
    if (onPaste && editorContainerRef.current) {
      editorContainerRef.current.addEventListener('paste', onPaste);
    }

    const editorTheme = EditorView.theme({
      "&": {
        fontSize: `${fontSize || 14}px`,
        fontFamily: "var(--font-mono)",
        height: "100%",
        backgroundColor: "transparent",
      },
      ".cm-content": {
        fontFamily: "var(--font-mono)",
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
    });

    const themeExtension = isDarkTheme ? vscodeDark : vscodeLight;

    const customExtensions = [
      ...(additionalExtensions || []),
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
      keymap.of([...defaultKeymap, ...historyKeymap]),
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

    actualEditorRef.current = view;

    onMount?.(view);

    if (autoFocus) {
      setTimeout(() => focusAtEndOfContent(view), 0);
    }

    return () => {
      // Clean up paste event listener
      if (onPaste && editorContainerRef.current) {
        editorContainerRef.current.removeEventListener('paste', onPaste);
      }
      view.destroy();
      actualEditorRef.current = null;
    };
  }, [defaultValue, language, onPaste]);

  return (
    <div
      ref={editorContainerRef}
      data-testid={testId}
      className={cn("w-full overflow-y-auto min-h-[24px]", className)}
      style={{
        height: height ? (typeof height === "string" ? height : `${height}px`) : undefined,
        maxHeight: maxHeight ? (typeof maxHeight === "string" ? maxHeight : `${maxHeight}px`) : undefined,
      }}
    />
  );
}

export default React.memo(CodeMirrorEditor);
