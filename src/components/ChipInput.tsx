import React, { KeyboardEvent, useState } from "react";

import { XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";

interface Props extends React.ComponentProps<"input"> {
  tagClassName?: string;
  tagsWrapperClassName?: string;
  wrapperClassName?: string;
  tags?: string[];
  onValueChange?: (value: string[]) => void;
}

const ChipInput = ({
  tags,
  onValueChange,
  tagClassName,
  tagsWrapperClassName,
  wrapperClassName,
  ...props
}: Props) => {
  const [inputValue, setInputValue] = useState("");

  const saveValue = () => {
    const value = inputValue.trim();

    if (!value) {
      return;
    }

    onValueChange?.([...(tags || []), inputValue.trim()]);
    setInputValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && inputValue.trim() !== "") {
      event.preventDefault();
      saveValue();
    }
  };

  return (
    <div className={wrapperClassName}>
      {tags?.length ? (
        <div className={cn("mb-2 flex flex-wrap gap-2", tagsWrapperClassName)}>
          {tags.map((tag, index) => (
            <Badge
              variant="outline"
              key={index}
              className={cn("flex items-center", tagClassName)}
            >
              <span>{tag}</span>
              <span
                onClick={() => {
                  onValueChange?.(tags.filter((_, i) => i !== index));
                }}
                className="ml-1 inline-flex cursor-pointer items-center justify-center"
              >
                <XIcon className="h-3 w-3" />
              </span>
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex">
        <Input
          {...props}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => saveValue()}
          placeholder="Type and press enter"
          className={cn(
            props.className,
            "flex-1",
            inputValue ? "border-dashed border-slate-400" : "",
          )}
        />
      </div>
    </div>
  );
};

export default ChipInput;
