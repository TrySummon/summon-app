import React from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import { cn } from "@/utils/tailwind";

interface CutIndicatorProps {
  position: number;
}

export default function CutIndicator({ position }: CutIndicatorProps) {
  const currentState = usePlaygroundStore((state) => state.getCurrentState());
  const updateCurrentState = usePlaygroundStore(
    (state) => state.updateCurrentState,
  );

  const cutPosition = currentState.cutPosition;
  const isActive = position === cutPosition;

  const handleCutPosition = () => {
    updateCurrentState((state) => ({
      ...state,
      cutPosition: position,
    }));
  };

  return (
    <div className="group relative flex items-center justify-center py-2">
      {/* Line */}
      <div
        className={cn(
          "absolute inset-x-0 z-0 h-px transition-all duration-200",
          isActive
            ? "bg-gradient-to-r from-transparent via-blue-500 to-transparent"
            : "bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600",
        )}
      />

      {/* Scissor button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCutPosition}
        className={cn(
          "relative z-10 h-8 w-8 p-0 transition-all duration-200 hover:scale-110",
          isActive
            ? "border-2 border-blue-300 bg-blue-100 text-blue-600 shadow-sm dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"
            : "border border-gray-200 bg-white text-gray-400 opacity-60 group-hover:opacity-100 hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500 dark:hover:text-gray-400",
        )}
      >
        <Scissors className="h-3.5 w-3.5" />
      </Button>

      {/* Cut position label */}
      {isActive && (
        <div className="absolute top-full left-1/2 z-20 mt-1 -translate-x-1/2 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          Input ends here
        </div>
      )}
    </div>
  );
}
