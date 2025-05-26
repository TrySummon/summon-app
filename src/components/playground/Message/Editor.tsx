import React, { useCallback, useEffect, useRef, useState } from 'react';
import CodeMirrorEditor from '../../CodeEditor';
import { cn } from '@/utils/tailwind';
import { EditorView } from 'codemirror';

interface Props {
    className?: string;
    placeholder?: string;
    autoFocus?: boolean;
    value?: string;
    readOnly?: boolean;
    maxHeight?: number;
    onChange?: (value: string) => void;
    onPasteImage?: (base64Url: string) => void;
}

const MessageEditor = ({
  maxHeight,
  onChange,
  onPasteImage,
  placeholder,
  className,
  readOnly,
  autoFocus,
  value,
}: Props) => {
  const editorRef = useRef<EditorView | null>(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(!value);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i]?.type.indexOf('image') !== -1) {
            const file = items[i]?.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const base64Url = reader.result;
                onPasteImage?.(base64Url as string);
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    },
    [onPasteImage]
  );

  const handleEditorChange = useCallback(
    (value: string) => {
      setIsEditorEmpty(!value);
      onChange?.(value);
    },
    [onChange]
  );

   // Update editor content when text changes
   useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editor.state.doc.toString();
    const newValue = value;

    if (currentValue !== newValue) {
      editor.dispatch({
        changes: { from: 0, to: currentValue.length, insert: newValue },
      });
    }
  }, [value]);

  const placeholderEl = isEditorEmpty ? (
    <div className="pointer-events-none absolute left-[1px] top-[3px] z-10 text-sm text-muted-foreground">
      {placeholder || "Enter a message..."}
    </div>
  ) : null;

  return (
    <div className={cn("relative w-full", className)}>
    {placeholderEl}
    <CodeMirrorEditor autoFocus={autoFocus} editorRef={editorRef} readOnly={readOnly} language='markdown' onChange={handleEditorChange} maxHeight={maxHeight} onPaste={handlePaste} />
    </div>
  );
};

export default MessageEditor;
