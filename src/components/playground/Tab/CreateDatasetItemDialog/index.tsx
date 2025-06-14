import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, ChevronLeft, ChevronRight } from "lucide-react";
import { UIMessage } from "ai";
import { toast } from "sonner";
import { usePlaygroundStore } from "../../store";
import type { Tool } from "@modelcontextprotocol/sdk/types";
import { Stepper } from "./Stepper";
import { BasicInfoStep } from "./BasicInfoStep";
import { TestCriteriaStep } from "./TestCriteriaStep";
import { ExpectedToolsStep } from "./ExpectedToolsStep";
import { ReviewStep } from "./ReviewStep";
import { STEPS } from "./constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    name: string;
    description?: string;
    naturalLanguageCriteria: string[];
    expectedToolCalls: string[];
  }) => void;
  datasetName: string;
  defaultName: string;
  messages: UIMessage[];
  cutPosition: number;
}

// Helper function to extract tool calls from messages
const extractToolCalls = (messages: UIMessage[]): string[] => {
  const toolCalls = new Set<string>();

  messages.forEach((message) => {
    message.parts?.forEach((part) => {
      if (part.type === "tool-invocation") {
        toolCalls.add(part.toolInvocation.toolName);
      }
    });
  });

  return Array.from(toolCalls);
};

export default function CreateDatasetItemDialog({
  open,
  onOpenChange,
  onConfirm,
  datasetName,
  defaultName,
  messages,
  cutPosition,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [naturalLanguageCriteria, setNaturalLanguageCriteria] = useState<
    string[]
  >([]);
  const [expectedToolCalls, setExpectedToolCalls] = useState<string[]>([]);

  // Get available tools from the playground store
  const mcpToolMap = usePlaygroundStore((state) => state.mcpToolMap);

  // Get all available tools
  const allAvailableTools = useMemo(() => {
    const tools: Array<{
      name: string;
      mcpName: string;
      description?: string;
    }> = [];

    Object.entries(mcpToolMap).forEach(([, mcpData]) => {
      (mcpData.tools as Tool[]).forEach((tool) => {
        tools.push({
          name: tool.name,
          mcpName: mcpData.name,
          description: tool.description,
        });
      });
    });

    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }, [mcpToolMap]);

  // Extract tool calls from ALL messages in the tab, not just cut messages
  useEffect(() => {
    const toolCalls = extractToolCalls(messages);
    setExpectedToolCalls(toolCalls);
  }, [messages]);

  const handleConfirm = () => {
    if (!name.trim()) {
      toast.error("Please provide a name for this dataset item");
      return;
    }

    onConfirm({
      name: name.trim(),
      description: description.trim() || undefined,
      naturalLanguageCriteria,
      expectedToolCalls,
    });
  };

  const canGoNext = () => {
    if (currentStep === 0) return name.trim().length > 0;
    return true;
  };

  const canGoBack = () => currentStep > 0;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (canGoBack()) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to any step that's been completed or is accessible
    // Don't allow skipping the first step if it's not completed
    if (stepIndex === 0 || isStepCompleted(0)) {
      setCurrentStep(stepIndex);
    }
  };

  const detectedToolCalls = extractToolCalls(messages);

  const isStepCompleted = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Basic info
        return name.trim().length > 0;
      case 1: // Criteria
        return true; // Optional step
      case 2: // Tools
        return true; // Optional step
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            messages={messages}
            cutPosition={cutPosition}
          />
        );
      case 1:
        return (
          <TestCriteriaStep
            naturalLanguageCriteria={naturalLanguageCriteria}
            setNaturalLanguageCriteria={setNaturalLanguageCriteria}
            messages={messages}
            cutPosition={cutPosition}
          />
        );
      case 2:
        return (
          <ExpectedToolsStep
            expectedToolCalls={expectedToolCalls}
            setExpectedToolCalls={setExpectedToolCalls}
            detectedToolCalls={detectedToolCalls}
            allAvailableTools={allAvailableTools}
            cutPosition={cutPosition}
            messages={messages}
          />
        );
      case 3:
        return (
          <ReviewStep
            datasetName={datasetName}
            name={name}
            description={description}
            naturalLanguageCriteria={naturalLanguageCriteria}
            expectedToolCalls={expectedToolCalls}
            messages={messages}
            cutPosition={cutPosition}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90svh] max-h-[90svh] w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        {/* Header with Stepper */}
        <DialogHeader className="flex-shrink-0 space-y-0 p-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 mt-0.5 rounded-lg p-2">
              <Database className="text-primary h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogTitle className="mb-0 text-xl font-semibold">
                Create Dataset Item
              </DialogTitle>
              <DialogDescription className="text-base">
                {STEPS[currentStep].description}
              </DialogDescription>
            </div>
          </div>

          <div>
            <Stepper
              steps={STEPS}
              currentStep={currentStep}
              isStepCompleted={isStepCompleted}
              onStepClick={handleStepClick}
            />
          </div>
        </DialogHeader>

        <Separator className="flex-shrink-0" />

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-6">{renderStepContent()}</div>
          </ScrollArea>
        </div>

        <Separator className="flex-shrink-0" />

        {/* Footer */}
        <DialogFooter className="flex-shrink-0 p-6 pt-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {canGoBack() && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={handleNext} disabled={!canGoNext()}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleConfirm} disabled={!name.trim()}>
                  Create Dataset Item
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
