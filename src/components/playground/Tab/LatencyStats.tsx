import React from "react";
import { usePlaygroundStore } from "../store";
import { cn } from "@/utils/tailwind";
import { ChevronDown, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LatencyStatsProps {
  scrollToBottom: () => void;
  showScrollButton: boolean;
}

export default function LatencyStats({
  scrollToBottom,
  showScrollButton,
}: LatencyStatsProps) {
  const tokenUsage = usePlaygroundStore(
    (state) => state.getCurrentState().tokenUsage,
  );
  const latency = usePlaygroundStore(
    (state) => state.getCurrentState().latency,
  );
  const cutMode = usePlaygroundStore(
    (state) => state.getCurrentState().cutMode,
  );

  // Format latency to be more readable (ms or s)
  const formatLatency = (latencyMs?: number) => {
    if (!latencyMs) return "0ms";
    if (latencyMs < 1000) return `${latencyMs}ms`;
    return `${(latencyMs / 1000).toFixed(2)}s`;
  };

  const showDetails = tokenUsage || latency;

  // Hide LatencyStats completely in cut mode to avoid overlapping with cut indicators
  if (cutMode) {
    return null;
  }

  if (!showDetails && !showScrollButton) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 transform flex-col items-center gap-2">
      {showScrollButton && (
        <Button
          size="icon"
          onClick={scrollToBottom}
          className="h-6 w-6 rounded-full"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}

      {showDetails && (
        <Badge
          variant="outline"
          className={cn(
            "text-muted-foreground bg-background flex items-center gap-1 font-mono text-xs",
            showScrollButton ? "border" : "border-none",
          )}
        >
          {latency !== undefined && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatLatency(latency)}</span>
            </div>
          )}
          {tokenUsage && (
            <>
              <div className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <span>{tokenUsage.inputTokens}t</span>
              </div>
              <div className="flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                <span>{tokenUsage.outputTokens}t</span>
              </div>
            </>
          )}
        </Badge>
      )}
    </div>
  );
}
