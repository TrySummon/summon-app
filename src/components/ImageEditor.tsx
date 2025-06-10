import React from "react";
import { ZoomableImage } from "./ZoomableImage";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";

interface Props {
  url: string;
  disabled?: boolean;
  onDelete?: () => void;
  readOnly?: boolean;
}

export default function ImageEditor({
  url,
  disabled,
  onDelete,
  readOnly = false,
}: Props) {
  return (
    <div
      className={`group relative flex max-w-[100px] overflow-hidden rounded-md border`}
    >
      {!readOnly && (
        <Button
          disabled={disabled}
          onClick={onDelete}
          variant="outline"
          size="icon"
          className="invisible absolute top-2 right-2 z-1 h-6 w-6 group-hover:visible"
        >
          <Trash size={14} />
        </Button>
      )}
      <ZoomableImage alt="Image" className="w-full object-cover" src={url} />
    </div>
  );
}
