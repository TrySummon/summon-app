import React, { useState } from "react";
import { MessageContent } from "./Content";
import RoleSelect from "./RoleSelect";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, PlayCircle, Database } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UIMessage } from "ai";
import CopyButton from "@/components/CopyButton";
import { usePlaygroundStore } from "../store";
import { useLocalDatasets } from "@/hooks/useLocalDatasets";
import { toast } from "sonner";

interface Props {
  message: UIMessage;
  autoFocus?: boolean;
  index: number;
  maxHeight?: number;
  children?: React.ReactNode;
}

export default function Message({
  message,
  index,
  autoFocus,
  maxHeight,
  children,
}: Props) {
  const updateMessage = usePlaygroundStore((state) => state.updateMessage);
  const deleteMessage = usePlaygroundStore((state) => state.deleteMessage);
  const rerunFromMessage = usePlaygroundStore(
    (state) => state.rerunFromMessage,
  );
  const getCurrentState = usePlaygroundStore((state) => state.getCurrentState);

  const { getDataset, addItem } = useLocalDatasets();

  const onChange = useCallback(
    (message: UIMessage) => {
      updateMessage(index, message);
    },
    [index, updateMessage],
  );

  const onDelete = useCallback(() => {
    deleteMessage(index);
  }, [index, deleteMessage]);

  const onRerun = useCallback(() => {
    rerunFromMessage(index);
  }, [index, rerunFromMessage]);

  const onSaveToDataset = useCallback(() => {
    const currentState = getCurrentState();
    const selectedDatasetId = currentState.selectedDatasetId;

    if (!selectedDatasetId) {
      toast.error("No dataset selected", {
        description: "Please select a dataset from the dropdown in the header.",
      });
      return;
    }

    const selectedDataset = getDataset(selectedDatasetId);
    if (!selectedDataset) {
      toast.error("Dataset not found", {
        description: "The selected dataset could not be found.",
      });
      return;
    }

    // Create a new item in the selected dataset with messages up to and including this message
    const messagesUpToHere = currentState.messages.slice(0, index + 1);
    const itemName = `Conversation up to message ${index + 1} - ${new Date().toLocaleString()}`;
    const itemId = addItem(selectedDatasetId, {
      name: itemName,
      messages: messagesUpToHere,
      systemPrompt: currentState.systemPrompt,
      model: currentState.model,
      settings: currentState.settings,
    });

    toast.success("Added to dataset", {
      description: `${messagesUpToHere.length} messages added to "${selectedDataset.name}" as item #${itemId.slice(0, 8)}.`,
    });
  }, [getCurrentState, getDataset, addItem, index]);

  // Determine if buttons should be visible based on autoFocus
  const showButtons = autoFocus;

  const messageContent =
    message.parts.length === 1 && message.parts[0].type === "text"
      ? message.parts[0].text
      : JSON.stringify(message.parts, null, 2);

  const currentState = getCurrentState();
  const hasMessages = currentState.messages.length > 0;

  return (
    <>
      <div className="group flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <RoleSelect
              disabled={!onChange}
              value={message.role}
              onValueChange={(v) => {
                onChange?.({
                  ...message,
                  role: v,
                });
              }}
            />
          </div>
          <TooltipProvider delayDuration={100}>
            <div
              className={`-mr-2 flex ${showButtons ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              {children}
              <CopyButton className="h-3.5 w-3.5" content={messageContent} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="text-muted-foreground"
                    onClick={onSaveToDataset}
                    variant="ghost"
                    size="icon"
                    disabled={!hasMessages}
                  >
                    <Database size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add conversation up to this message to dataset</p>
                </TooltipContent>
              </Tooltip>
              {onRerun && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="text-muted-foreground"
                      onClick={onRerun}
                      variant="ghost"
                      size="icon"
                    >
                      <PlayCircle size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Rerun from this message</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {onDelete ? (
                <Button
                  className="text-muted-foreground"
                  onClick={onDelete}
                  variant="ghost"
                  size="icon"
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </div>
          </TooltipProvider>
        </div>
        <MessageContent
          autoFocus={autoFocus}
          maxHeight={maxHeight}
          message={message}
          onChange={onChange}
        />
      </div>
    </>
  );
}
