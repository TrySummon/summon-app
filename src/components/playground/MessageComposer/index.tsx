import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AutoButton } from "@/components/ui/AutoButton";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import { Attachment } from "ai";
import { runPlaygroundAgent } from "@/lib/agent";
import { ArrowUp, Square } from "lucide-react";
import { MessageContent } from "../Message/Content";
import ImageDialog from "@/components/ImageDialog";
import { usePostHog } from "@/hooks/usePostHog";

export default function MessageComposer() {
  const ref = useRef<HTMLDivElement>(null);

  const running = usePlaygroundStore(
    (state) => state.getCurrentState().running,
  );
  const autoExecuteTools = usePlaygroundStore((state) =>
    state.getAutoExecuteTools(),
  );
  const setAutoExecuteTools = usePlaygroundStore(
    (state) => state.setAutoExecuteTools,
  );
  const addMessage = usePlaygroundStore((state) => state.addMessage);
  const stopAgent = usePlaygroundStore((state) => state.stopAgent);
  const composer = usePlaygroundStore((state) => state.getComposer());
  const setComposer = usePlaygroundStore((state) => state.setComposer);
  const resetComposer = usePlaygroundStore((state) => state.resetComposer);

  const { captureEvent } = usePostHog();

  const isComposerEmpty = !composer.parts.find(
    (part) => part.type === "text" && part.text.trim() !== "",
  );

  const disabled = running || isComposerEmpty;

  const handleAddMessage = useCallback(() => {
    if (disabled) return;

    // Trim the text before adding the message
    const trimmedComposer = {
      ...composer,
      parts: composer.parts.map((part) => {
        if (part.type === "text") {
          // Trim the text and remove leading/trailing new lines
          return { ...part, text: part.text.trim().replace(/^\n+|\n+$/g, "") };
        }
        return part;
      }),
    };

    // Capture message composition event
    const messageLength = trimmedComposer.parts
      .filter((part) => part.type === "text")
      .reduce((total, part) => total + part.text.length, 0);

    const hasAttachments =
      (trimmedComposer.experimental_attachments?.length || 0) > 0;

    captureEvent("playground_message_sent", {
      messageLength,
      hasAttachments,
      attachmentCount: trimmedComposer.experimental_attachments?.length || 0,
    });

    // Add the message to the current state using the zustand store
    addMessage(trimmedComposer);
    // Reset the composer
    resetComposer();
    runPlaygroundAgent();
  }, [disabled, composer, captureEvent, addMessage, resetComposer]);

  // Keyboard shortcut handler
  useEffect(() => {
    if (!ref.current) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        handleAddMessage();
      }
    };

    ref.current.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      ref.current?.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAddMessage]);

  const addImage = useCallback(
    (url: string, contentType: string) => {
      const toAdd: Attachment = { url, contentType };
      setComposer({
        ...composer,
        experimental_attachments: [
          ...(composer.experimental_attachments || []),
          toAdd,
        ],
      });
    },
    [composer, setComposer],
  );

  const handleToggleAutoExecute = useCallback(() => {
    setAutoExecuteTools(!autoExecuteTools);

    captureEvent("playground_auto_execute_toggled", {
      enabled: !autoExecuteTools,
    });
  }, [setAutoExecuteTools, autoExecuteTools, captureEvent]);

  const submitButton = useMemo(() => {
    if (running) {
      return (
        <Button
          className="rounded-full"
          size="icon"
          onClick={() => {
            stopAgent();
            captureEvent("playground_ai_agent_stop");
          }}
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      );
    }

    return (
      <Button
        className="rounded-full"
        size="icon"
        disabled={disabled}
        onClick={handleAddMessage}
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    );
  }, [handleAddMessage, disabled, running, stopAgent, captureEvent]);

  const autoExecuteToggle = useMemo(
    () => (
      <AutoButton
        isEnabled={autoExecuteTools}
        onToggle={handleToggleAutoExecute}
      />
    ),
    [autoExecuteTools, handleToggleAutoExecute],
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-4">
      <div
        ref={ref}
        className="bg-card flex flex-col gap-4 rounded-md border p-4"
      >
        <MessageContent
          autoFocus
          maxHeight={200}
          message={composer}
          onChange={setComposer}
        />
        <div className="flex justify-between">
          <div className="-ml-2 flex items-center gap-2">
            <ImageDialog className="h-4 w-4" onAddImage={addImage} />
          </div>
          <div className="flex items-center gap-4">
            {autoExecuteToggle}
            {submitButton}
          </div>
        </div>
      </div>
    </div>
  );
}
