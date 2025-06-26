import CodeMirrorEditor from "../../CodeEditor";
import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/utils/tailwind";
import { EditorView } from "codemirror";
import { placeholder } from "@codemirror/view";

interface Props {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  value?: string;
  readOnly?: boolean;
  maxHeight?: number;
  onChange?: (value: string) => void;
  onPasteImage?: (base64Url: string, contentType: string) => void;
}

const MessageEditor = ({
  maxHeight,
  onChange,
  onPasteImage,
  placeholder: placeholderText,
  className,
  readOnly,
  autoFocus,
  value,
}: Props) => {
  const editorRef = useRef<EditorView | null>(null);
  const isProgrammaticChangeRef = useRef(false);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i]?.type.indexOf("image") !== -1) {
            const file = items[i]?.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const base64Url = reader.result;
                onPasteImage?.(base64Url as string, file.type);
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    },
    [onPasteImage],
  );

  const handleEditorChange = useCallback(
    (value: string) => {
      // Only trigger onChange if the change wasn't programmatic
      if (!isProgrammaticChangeRef.current) {
        onChange?.(value);
      } else {
        // Reset the flag after handling the programmatic change
        isProgrammaticChangeRef.current = false;
      }
    },
    [onChange],
  );

  // Update editor content when text changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editor.state.doc.toString();
    const newValue = value;

    if (currentValue !== newValue) {
      // Set flag to indicate this is a programmatic change
      isProgrammaticChangeRef.current = true;
      editor.dispatch({
        changes: { from: 0, to: currentValue.length, insert: newValue },
      });
    }
  }, [value, handlePaste]);

  // Create placeholder extension
  const additionalExtensions = React.useMemo(
    () => [placeholder(placeholderText || "Enter a message...")],
    [placeholderText],
  );

  return (
    <div className={cn("relative w-full", className)}>
      <CodeMirrorEditor
        autoFocus={autoFocus}
        editorRef={editorRef}
        readOnly={readOnly}
        language="markdown"
        onChange={handleEditorChange}
        maxHeight={maxHeight}
        onPaste={handlePaste}
        additionalExtensions={additionalExtensions}
      />
    </div>
  );
};

export default MessageEditor;
