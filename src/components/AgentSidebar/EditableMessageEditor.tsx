import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp, X } from "lucide-react";
import CodeMirrorEditor from "@/components/CodeEditor";
import { EditorView } from "codemirror";
import { Extension } from "@codemirror/state";
import { placeholder, keymap } from "@codemirror/view";
import { Attachment, JSONValue, Message } from "ai";
import { MentionData, extractMentions } from "@/components/CodeEditor";
import { AttachmentsDisplay } from "./AttachmentsDisplay";

interface EditableMessageEditorProps {
  message: Message;
  mentionData: MentionData[];
  onUpdateMessage: (message: Message) => void;
  onCancel: () => void;
}

export function EditableMessageEditor({
  message,
  mentionData,
  onUpdateMessage,
  onCancel,
}: EditableMessageEditorProps) {
  const [messageText, setMessageText] = useState(message.content || "");
  const [attachedFiles, setAttachedFiles] = useState<Attachment[]>(
    message.experimental_attachments || [],
  );
  const editorRef = useRef<EditorView | null>(null);

  const isEmpty = !messageText.trim() && attachedFiles.length === 0;

  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.name !== fileId));
  }, []);

  const handleSaveMessage = useCallback(() => {
    if (!editorRef.current) return;
    const currentMessage = editorRef.current.state.doc.toString();
    const trimmedMessage = currentMessage.trim();

    if (!trimmedMessage && attachedFiles.length === 0) {
      return;
    }

    const extractedMentions = extractMentions(trimmedMessage, mentionData);

    const updatedMessage: Message = {
      ...message,
      content: trimmedMessage,
      parts: [{ type: "text", text: trimmedMessage }],
      experimental_attachments: attachedFiles,
      annotations: extractedMentions as unknown as JSONValue[],
    };

    onUpdateMessage(updatedMessage);
  }, [message, attachedFiles, mentionData, onUpdateMessage]);

  const extensions: Extension[] = useMemo(
    () => [
      placeholder("Enter to save • Escape to cancel"),
      keymap.of([
        {
          key: "Enter",
          run: () => {
            handleSaveMessage();
            return true;
          },
        },
        {
          key: "Escape",
          run: () => {
            onCancel();
            return true;
          },
        },
      ]),
    ],
    [handleSaveMessage, onCancel],
  );

  // Focus editor at the end when component mounts
  useEffect(() => {
    if (editorRef.current) {
      const view = editorRef.current;
      view.focus();
      // Move cursor to the end of the document
      view.dispatch({
        selection: { anchor: view.state.doc.length },
      });
    }
  }, []);

  return (
    <div className="bg-card flex min-h-[90px] flex-col gap-2 rounded-lg border p-3">
      {/* Attachments section: files only (mentions are now handled directly in the editor) */}
      {attachedFiles.length > 0 && (
        <AttachmentsDisplay
          mentions={[]}
          attachments={attachedFiles}
          onRemoveFile={handleRemoveFile}
          editable={true}
        />
      )}

      <CodeMirrorEditor
        className="-mt-1"
        editorRef={editorRef}
        defaultValue={message.content || ""}
        maxHeight="300px"
        language="markdown"
        additionalExtensions={extensions}
        mentionData={mentionData}
        fontSize={15}
        regularFont
        onChange={setMessageText}
      />

      <div className="mt-auto flex items-center justify-between pt-2">
        <div></div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-6 w-6 rounded-full"
                size="icon"
                variant="ghost"
                onClick={onCancel}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel (Escape)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-6 w-6 rounded-full"
                size="icon"
                disabled={isEmpty}
                onClick={handleSaveMessage}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save changes (Enter)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
