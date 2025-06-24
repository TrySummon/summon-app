import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUp, Square } from "lucide-react";
import CodeMirrorEditor from "@/components/CodeEditor";
import { EditorView } from "codemirror";
import { Extension } from "@codemirror/state";
import { placeholder, keymap } from "@codemirror/view";
import { usePostHog } from "@/hooks/usePostHog";
import { Message } from "ai";
import { MentionPill } from "@/components/MentionPill";
import { AutoButton } from "@/components/ui/AutoButton";
import { MentionData } from "./index";
import {
  extractMentions,
  createMentionRegex,
  createMentionAutocompletion,
  createMentionDecorationPlugin,
  createMentionBackspaceHandler,
} from "./mentionUtils";

interface AttachedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  mimeType?: string; // For images
}

interface MessageComposerProps {
  onSendMessage: (message: Message) => boolean;
  onStopAgent: () => void;
  isRunning?: boolean;
  attachedFiles: AttachedFile[];
  onRemoveFile: (fileId: string) => void;
  onClearAttachments: () => void;
  mentionData: MentionData[];
}

export function MessageComposer({
  onSendMessage,
  onStopAgent,
  isRunning = false,
  attachedFiles,
  onRemoveFile,
  onClearAttachments,
  mentionData,
}: MessageComposerProps) {
  const { captureEvent } = usePostHog();
  const [message, setMessage] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const editorRef = useRef<EditorView | null>(null);

  const isEmpty = !message.trim() && attachedFiles.length === 0;

  const mentions = useMemo(
    () => extractMentions(message, mentionData),
    [message, mentionData],
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
      // The editor's update listener will call `setMessage`
    }
  }, []);

  const handleAddMessage = useCallback(() => {
    if (!editorRef.current) return;
    const currentMessage = editorRef.current.state.doc.toString();
    const trimmedMessage = currentMessage.trim();

    if (!trimmedMessage && attachedFiles.length === 0) {
      return;
    }

    const fileAttachments = attachedFiles
      ? attachedFiles.map((file) => ({
          name: file.name,
          url: file.url,
          mimeType: file.mimeType || file.type,
        }))
      : [];

    const aiMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: "user",
      content: trimmedMessage, // Send trimmed message
      experimental_attachments: fileAttachments,
    };

    captureEvent("summon_agent_message_sent", {
      messageLength: trimmedMessage.length,
      hasAttachments: aiMessage.experimental_attachments?.length || 0 > 0,
      attachmentCount: aiMessage.experimental_attachments?.length || 0,
    });

    const wasMessageSent = onSendMessage(aiMessage);

    // Only clear the message and attachments if the message was actually sent
    if (wasMessageSent) {
      if (editorRef.current) {
        editorRef.current.dispatch({
          changes: {
            from: 0,
            to: editorRef.current.state.doc.length,
            insert: "",
          },
        });
      }
      onClearAttachments();
    }
  }, [captureEvent, onSendMessage, onClearAttachments, attachedFiles]);

  const submitButton = useMemo(() => {
    if (isRunning) {
      return (
        <Button
          className="h-6 w-6 rounded-full"
          size="icon"
          onClick={() => {
            onStopAgent();
            captureEvent("summon_ai_agent_stop");
          }}
        >
          <Square className="h-3 w-3 fill-current" />
        </Button>
      );
    }

    return (
      <Button
        className="h-6 w-6 rounded-full"
        size="icon"
        disabled={isEmpty}
        onClick={handleAddMessage}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
    );
  }, [handleAddMessage, isEmpty, isRunning, onStopAgent, captureEvent]);

  const extensions: Extension[] = useMemo(
    () => [
      placeholder("Enter to send • Shift+Enter for new line"),
      mentionAutocompletion,
      mentionDecorationPlugin,
      keymap.of([
        {
          key: "Enter",
          run: () => {
            handleAddMessage();
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
      handleAddMessage,
      mentionAutocompletion,
      mentionDecorationPlugin,
      mentionBackspaceHandler,
    ],
  );

  return (
    <div className="bg-card flex min-h-[90px] flex-col gap-2 rounded-lg border p-3">
      {/* Attachments section: mentions and files */}
      {(mentions.length > 0 || attachedFiles.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {mentions.map((mention) => (
            <MentionPill
              key={mention.text}
              text={mention.text}
              type={mention.type}
              onDelete={() => handleRemoveMention(mention.text)}
            />
          ))}
          {attachedFiles.map((file) => (
            <MentionPill
              key={file.id}
              text={file.name}
              type={
                file.type.startsWith("image/")
                  ? "image"
                  : file.type === "api"
                    ? "api"
                    : "file"
              }
              onDelete={() => onRemoveFile(file.id)}
            />
          ))}
        </div>
      )}

      <CodeMirrorEditor
        className="-mt-1"
        editorRef={editorRef}
        defaultValue=""
        value={message}
        maxHeight="300px"
        language="markdown"
        additionalExtensions={extensions}
        fontSize={15}
        regularFont
        onChange={setMessage}
      />

      <div className="mt-auto flex items-center justify-between pt-2">
        <div></div>
        <div className="flex items-center gap-2">
          <AutoButton
            isEnabled={autoApprove}
            onToggle={() => setAutoApprove(!autoApprove)}
            disabled={isRunning}
            className="h-6"
          />
          <Tooltip>
            <TooltipTrigger asChild>{submitButton}</TooltipTrigger>
            <TooltipContent>
              <p>Send message (Enter)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
