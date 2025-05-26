import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Message } from "ai";

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
    <Select onValueChange={onValueChange} value={value} disabled={disabled}>
      <SelectTrigger className="gap-1 w-fit shadow-none border-none bg-transparent px-0 font-medium focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
        <SelectValue placeholder="Role" />
      </SelectTrigger>
      <SelectContent>{items}</SelectContent>
    </Select>
  );
}
