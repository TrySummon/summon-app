import React from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FixToolCallComposer } from "./FixToolCallComposer";
import type { MentionedTool } from "./types";

interface ComposerStateProps {
  toolName?: string;
  onSubmit: (message: string, mentionedTools: MentionedTool[]) => void;
}

export function ComposerState({ toolName, onSubmit }: ComposerStateProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Fix Tool Call</DialogTitle>
        <DialogDescription>
          Explain the issue with this tool call. Tag the relevant tools with @.
        </DialogDescription>
      </DialogHeader>
      <div className="my-4" />
      <FixToolCallComposer toolName={toolName} onSubmit={onSubmit} />
    </>
  );
}
