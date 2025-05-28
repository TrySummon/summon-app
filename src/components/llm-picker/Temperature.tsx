"use client";

import React, { useMemo } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { AIProviderType, AI_PROVIDERS_CONFIG } from "@/components/ai-providers/types";

type TemperatureSelectorProps = {
  max?: number;
  min?: number;
  model: string;
  provider: string;
  value?: number;
  onChange: (value: number) => void;
};

export const TemperatureSelector: React.FC<TemperatureSelectorProps> = ({
  value = 0,
  onChange,
  model,
  provider,
  min = 0,
  max = 1,
}) => {
  const [minTemperature, maxTemperature] = useMemo(() => {
    if (!provider || !model) {
      return [min, max];
    }
    
    const providerConfig = AI_PROVIDERS_CONFIG[provider as AIProviderType];
    if (!providerConfig) {
      return [min, max];
    }
    
    if (model in providerConfig.models) {
      return providerConfig.models[model].temperatureRange;
    }
    
    return providerConfig.defaultTemperatureRange;
  }, [max, min, model, provider]);

  return (
    <div className="grid gap-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                {value}
              </span>
            </div>
            <Slider
              id="temperature"
              max={maxTemperature}
              min={minTemperature}
              value={[value]}
              step={0.1}
              onValueChange={([v]) => onChange(v!)}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
              aria-label="Temperature"
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-[260px] text-sm"
          side="left"
        >
          Controls randomness: lowering results in less random completions. As
          the temperature approaches zero, the model will become deterministic
          and repetitive.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
};
