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
import { MentionData } from "./index";
import {
  extractMentions,
  createMentionRegex,
  createMentionAutocompletion,
  createMentionDecorationPlugin,
  createMentionBackspaceHandler,
} from "./mentionUtils";
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

  const mentions = useMemo(
    () => extractMentions(messageText, mentionData),
    [messageText, mentionData],
  );

  const mentionRegex = useMemo(
    () => createMentionRegex(mentionData),
    [mentionData],
  );

  const mentionAutocompletion = useMemo(
    () => createMentionAutocompletion(mentionData),
    [mentionData],
  );

  const mentionDecorationPlugin = useMemo(
    () => createMentionDecorationPlugin(mentionRegex),
    [mentionRegex],
  );

  const mentionBackspaceHandler = useMemo(
    () => createMentionBackspaceHandler(mentionData, mentionRegex),
    [mentionData, mentionRegex],
  );

  const handleRemoveMention = useCallback((mentionText: string) => {
    if (editorRef.current) {
      const view = editorRef.current;
      const currentDoc = view.state.doc.toString();
      const newDoc = currentDoc
        .replace(new RegExp(`\\${mentionText}\\b`, "g"), "")
        .trim();
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newDoc },
      });
    }
  }, []);

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
      experimental_attachments: attachedFiles,
      annotations: extractedMentions as unknown as JSONValue[],
    };

    onUpdateMessage(updatedMessage);
  }, [message, attachedFiles, mentionData, onUpdateMessage]);

  const extensions: Extension[] = useMemo(
    () => [
      placeholder("Enter to save • Escape to cancel"),
      mentionAutocompletion,
      mentionDecorationPlugin,
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
        {
          key: "Backspace",
          run: mentionBackspaceHandler,
        },
      ]),
    ],
    [
      handleSaveMessage,
      onCancel,
      mentionAutocompletion,
      mentionDecorationPlugin,
      mentionBackspaceHandler,
    ],
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
      {/* Attachments section: mentions and files */}
      <AttachmentsDisplay
        mentions={mentions}
        attachments={attachedFiles}
        onRemoveMention={handleRemoveMention}
        onRemoveFile={handleRemoveFile}
        editable={true}
      />

      <CodeMirrorEditor
        className="-mt-1"
        editorRef={editorRef}
        defaultValue={message.content || ""}
        maxHeight="300px"
        language="markdown"
        additionalExtensions={extensions}
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
