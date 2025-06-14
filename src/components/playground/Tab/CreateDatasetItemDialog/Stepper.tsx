import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/tailwind";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  isStepCompleted: (stepIndex: number) => boolean;
  onStepClick?: (stepIndex: number) => void;
}

export function Stepper({
  steps,
  currentStep,
  isStepCompleted,
  onStepClick,
}: StepperProps) {
  return (
    <div className="mt-4 flex items-center gap-2">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep || isStepCompleted(index);
        const isClickable = onStepClick && index !== currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                "flex items-center gap-2",
                isClickable &&
                  "cursor-pointer transition-opacity hover:opacity-70",
              )}
              onClick={() => isClickable && onStepClick(index)}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isActive &&
                    "bg-primary border-primary text-primary-foreground",
                  isCompleted &&
                    !isActive &&
                    "bg-primary/10 border-primary text-primary",
                  !isActive &&
                    !isCompleted &&
                    "border-muted-foreground/20 text-muted-foreground",
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors",
                  isActive && "text-foreground",
                  !isActive && "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="bg-border h-px w-8 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
