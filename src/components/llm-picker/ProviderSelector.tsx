"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIProviderType } from "@/components/ai-providers/types";

type ProviderSelectorProps = {
  value: AIProviderType;
  onChange: (value: AIProviderType) => void;
  compact?: boolean;
};

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  return (
    <div className="provider-select flex flex-col gap-2">
      {!compact && <Label>Provider</Label>}
      <Select
        value={value}
        onValueChange={(val) => onChange(val as AIProviderType)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select provider" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(AIProviderType).map((provider) => (
            <SelectItem key={provider} value={provider}>
              {provider}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
