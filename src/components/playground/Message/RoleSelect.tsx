import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Message } from "ai";
import { cn } from "@/utils/tailwind";

const roles = [
  "system",
  "user",
  "assistant",
  "data",
] satisfies Message["role"][];

interface Props {
  value: Message["role"];
  disabled?: boolean;
  onValueChange: (v: Message["role"]) => void;
}

export default function RoleSelect({ value, disabled, onValueChange }: Props) {
  const items = roles.map((r) => (
    <SelectItem key={r} value={r}>
      {r}
    </SelectItem>
  ));

  return (
    <div className="group/role">
      <Select onValueChange={onValueChange} value={value} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "text-muted-foreground/70 w-fit gap-1 border-none bg-transparent px-0 text-xs font-medium shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
            "[&>svg]:opacity-0 [&>svg]:transition-opacity group-hover/role:[&>svg]:opacity-100",
          )}
        >
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>{items}</SelectContent>
      </Select>
    </div>
  );
}
