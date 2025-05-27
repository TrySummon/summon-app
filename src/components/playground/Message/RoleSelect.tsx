import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Message } from "ai";
import { cn } from "@/utils/tailwind";

const roles = ["system", "user", "assistant", "data"] satisfies Message["role"][];

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
        <SelectTrigger className={cn(
          "gap-1 w-fit shadow-none border-none bg-transparent px-0 font-medium focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-muted-foreground",
          "[&>svg]:opacity-0 group-hover/role:[&>svg]:opacity-100 [&>svg]:transition-opacity"
        )}>
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>{items}</SelectContent>
      </Select>
    </div>
  );
}
