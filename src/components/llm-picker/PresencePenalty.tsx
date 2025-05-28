import * as React from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type PresenceSelectorProps = {
  value?: number;
  onChange: (value: number) => void;
};

export const PresenceSelector: React.FC<PresenceSelectorProps> = ({
  value = 0,
  onChange,
}) => {
  return (
    <div className="grid gap-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="presence-penalty">Presence Penalty</Label>
              <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                {value}
              </span>
            </div>
            <Slider
              id="presence-penalty"
              max={1}
              defaultValue={[value]}
              step={0.1}
              onValueChange={([v]) => onChange(v!)}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              aria-label="Presence Penalty"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-[260px] text-sm"
          side="left"
        >
          How much to penalize new tokens based on whether they appear in the
          text so far. Increases the model's likelihood to talk about new
          topics.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
