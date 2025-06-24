import React from "react";
import { Attachment } from "ai";
import {
  MentionPill,
  getFileTypeFromContentType,
} from "@/components/MentionPill";
import { ExtractedMention } from "./mentionUtils";

interface AttachmentsDisplayProps {
  mentions: ExtractedMention[];
  attachments: Attachment[];
  onRemoveMention?: (mentionText: string) => void;
  onRemoveFile?: (fileId: string) => void;
  editable?: boolean;
}

export function AttachmentsDisplay({
  mentions,
  attachments,
  onRemoveMention,
  onRemoveFile,
  editable = false,
}: AttachmentsDisplayProps) {
  if (mentions.length === 0 && attachments.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mentions.map((mention) => (
        <MentionPill
          key={mention.text}
          text={mention.text}
          type={mention.type}
          onDelete={
            editable ? () => onRemoveMention?.(mention.text) : undefined
          }
        />
      ))}
      {attachments.map((file) => (
        <MentionPill
          key={file.name}
          text={file.name || "Unnamed file"}
          type={getFileTypeFromContentType(file.contentType)}
          onDelete={editable ? () => onRemoveFile?.(file.name!) : undefined}
        />
      ))}
    </div>
  );
}
