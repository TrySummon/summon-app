import React, { useEffect, useMemo } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AIProviderType,
  AI_PROVIDERS_CONFIG,
} from "@/components/ai-providers/types";

const MAX_MAX_LENGTH = 32768;

type MaxLengthSelectorProps = {
  model: string;
  provider: string;
  value?: number;
  onChange: (value: number) => void;
};

export const MaxLengthSelector: React.FC<MaxLengthSelectorProps> = ({
  model,
  provider,
  value = 256,
  onChange,
}) => {
  const modelData = useMemo(() => {
    if (!provider || !model) return null;

    const providerConfig = AI_PROVIDERS_CONFIG[provider as AIProviderType];
    if (!providerConfig) return null;

    return providerConfig.models[model];
  }, [provider, model]);

  const maxValue = modelData?.max_tokens;

  useEffect(() => {
    if (maxValue != null && value > maxValue) {
      onChange(maxValue);
    }
  }, [maxValue, value]);

  return (
    <div className="grid gap-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxlength">Maximum Length</Label>
              <span className="text-muted-foreground hover:border-border w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm">
                {value}
              </span>
            </div>
            <Slider
              id="maxlength"
              max={maxValue || MAX_MAX_LENGTH}
              onValueChange={([v]) => onChange(v!)}
              step={10}
              value={[value]}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              aria-label="Maximum Length"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-[260px] text-sm"
          side="left"
        >
          The maximum number of tokens to generate. Requests can use up to
          32,000 tokens, shared between prompt and completion. The exact limit
          varies by model.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
