import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlaygroundStore } from "../store";
import { Attachment, UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { runAgent } from "../agent";
import { ArrowUp, Square, Zap } from "lucide-react";
import { MessageContent } from "../Message/Content";
import ImageDialog from "@/components/ImageDialog";
import { usePostHog } from "@/hooks/usePostHog";

export default function MessageComposer() {
  const ref = useRef<HTMLDivElement>(null);

  const running = usePlaygroundStore(
    (state) => state.getCurrentState().running,
  );
  const autoExecuteTools = usePlaygroundStore(
    (state) => state.getCurrentState().autoExecuteTools ?? false,
  );
  const updateCurrentState = usePlaygroundStore((state) => state.updateCurrentState);
  const addMessage = usePlaygroundStore((state) => state.addMessage);
  const stopAgent = usePlaygroundStore((state) => state.stopAgent);

  const { captureEvent } = usePostHog();

  const [composer, setComposer] = useState<UIMessage>({
    id: uuidv4(),
    role: "user",
    content: "",
    parts: [{ type: "text", text: "" }],
  });

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
    setComposer((prev) => ({
      id: uuidv4(),
      role: prev.role,
      content: "",
      parts: [{ type: "text", text: "" }],
    }));
    runAgent();
  }, [disabled, composer, captureEvent, addMessage]);

  // Keyboard shortcut handler
  useEffect(() => {
    if (!ref.current) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
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
    [composer, setComposer, captureEvent],
  );

  const handleToggleAutoExecute = useCallback(() => {
    updateCurrentState(
      (state) => ({
        ...state,
        autoExecuteTools: !state.autoExecuteTools,
      }),
      false, // Don't add to history
      `${autoExecuteTools ? 'Disabled' : 'Enabled'} auto-execute tools`
    );
    
    captureEvent("playground_auto_execute_toggled", {
      enabled: !autoExecuteTools,
    });
  }, [updateCurrentState, autoExecuteTools, captureEvent]);

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

  const autoExecuteToggle = useMemo(() => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={autoExecuteTools ? "secondary" : "ghost"}
            size="sm"
            onClick={handleToggleAutoExecute}
            disabled={running}
            className="flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" />
            Auto
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Auto-execute tools: {autoExecuteTools ? 'ON' : 'OFF'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ), [autoExecuteTools, handleToggleAutoExecute, running]);

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
