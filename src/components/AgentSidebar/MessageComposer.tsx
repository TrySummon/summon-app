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
import { JSONValue, Message } from "ai";
import { AutoButton } from "@/components/ui/AutoButton";
import {
  extractMentions,
  createMentionRegex,
  createMentionAutocompletion,
  createMentionDecorationPlugin,
  createMentionBackspaceHandler,
} from "./mentionUtils";
import { AttachmentsDisplay } from "./AttachmentsDisplay";
import { useAgentContext } from "./AgentContext";
import { cn } from "@/utils/tailwind";

interface MessageComposerProps {
  className?: string;
}

export function MessageComposer({ className }: MessageComposerProps) {
  const {
    onSendMessage,
    onStopAgent,
    isRunning,
    attachedFiles,
    onRemoveFile,
    onClearAttachments,
    mentionData,
    autoApprove,
    setAutoApprove,
  } = useAgentContext();
  const { captureEvent } = usePostHog();
  const [message, setMessage] = useState("");
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
          contentType: file.contentType,
        }))
      : [];

    const mentions = extractMentions(trimmedMessage, mentionData);

    const aiMessage: Message = {
      id: Math.random().toString(36).substring(2, 11),
      role: "user",
      content: trimmedMessage,
      experimental_attachments: fileAttachments,
      annotations: mentions as unknown as JSONValue[],
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
  }, [
    captureEvent,
    onSendMessage,
    onClearAttachments,
    mentionData,
    attachedFiles,
  ]);

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
      placeholder("Add, improve and manage MCP tools."),
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
    <div
      className={cn(
        "dark:bg-sidebar-accent/50 bg-card dark:sidebar-border flex min-h-[100px] flex-col gap-2 rounded-lg border p-3",
        className,
      )}
    >
      {/* Attachments section: mentions and files */}
      <AttachmentsDisplay
        mentions={mentions}
        attachments={attachedFiles}
        onRemoveMention={handleRemoveMention}
        onRemoveFile={onRemoveFile}
        editable={true}
      />

      <CodeMirrorEditor
        className="-mt-1"
        editorRef={editorRef}
        defaultValue={message}
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
