"use client";

import * as React from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import ChipInput from "../ChipInput";

type StopSelectorProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export const StopSelector: React.FC<StopSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="grid gap-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-2">
            <Label htmlFor="stop">Stop Sequences</Label>
            <ChipInput tags={value} onValueChange={onChange} />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-[260px] text-sm"
          side="left"
        >
          Up to four sequences where the API will stop generating further
          tokens. The returned text will not contain the stop sequence.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
