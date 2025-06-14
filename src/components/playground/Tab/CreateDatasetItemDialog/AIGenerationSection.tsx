import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Square } from "lucide-react";

interface AIGenerationSectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  isGenerating: boolean;
  onGenerate: () => void;
  onStop: () => void;
  generateButtonText?: string;
  className?: string;
}

export function AIGenerationSection({
  icon,
  title,
  subtitle,
  isGenerating,
  onGenerate,
  onStop,
  generateButtonText = "Generate",
  className = "",
}: AIGenerationSectionProps) {
  return (
    <div
      className={`border-primary/20 from-primary/5 to-primary/10 relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 ${className}`}
    >
      <div className="bg-primary/10 absolute -top-12 -right-12 h-24 w-24 rounded-full" />
      <div className="bg-primary/5 absolute -bottom-8 -left-8 h-16 w-16 rounded-full" />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            {icon}
          </div>
          <div>
            <h3 className="text-foreground font-semibold">{title}</h3>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>
        </div>

        {isGenerating ? (
          <Button onClick={onStop}>
            <Square className="mr-2 h-4 w-4 fill-current" />
            Stop
          </Button>
        ) : (
          <Button onClick={onGenerate}>
            <Sparkles className="mr-2 h-4 w-4" />
            {generateButtonText}
          </Button>
        )}
      </div>
    </div>
  );
}
