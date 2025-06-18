import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Target, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePlaygroundStore } from "../../../../stores/playgroundStore";
import { generateCriteria } from "./prefillGenerator";
import { AIGenerationSection } from "./AIGenerationSection";
import { UIMessage } from "ai";

interface TestCriteriaStepProps {
  naturalLanguageCriteria: string[];
  setNaturalLanguageCriteria: (criteria: string[]) => void;
  messages: UIMessage[];
  cutPosition: number;
}

export function TestCriteriaStep({
  naturalLanguageCriteria,
  setNaturalLanguageCriteria,
  messages,
  cutPosition,
}: TestCriteriaStepProps) {
  const [newCriterion, setNewCriterion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current model configuration
  const model = usePlaygroundStore((state) => state.getCurrentState().model);
  const credentialId = usePlaygroundStore(
    (state) => state.getCurrentState().credentialId,
  );

  // Check if cut position is at the end (no output messages to evaluate)
  const isAtEnd = cutPosition >= messages.length;

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAddCriterion = () => {
    if (newCriterion.trim() && !isAtEnd) {
      setNaturalLanguageCriteria([
        ...naturalLanguageCriteria,
        newCriterion.trim(),
      ]);
      setNewCriterion("");
    }
  };

  const handleRemoveCriterion = (index: number) => {
    setNaturalLanguageCriteria(
      naturalLanguageCriteria.filter((_, i) => i !== index),
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddCriterion();
    }
  };

  const handleGenerateCriteria = async () => {
    if (!model || !credentialId || isAtEnd) {
      if (isAtEnd) {
        toast.error(
          "Cannot generate criteria when cut is at the end of conversation",
        );
      } else {
        toast.error("Please configure a model and credential first");
      }
      return;
    }

    // Abort any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);

    try {
      await generateCriteria(
        {
          model,
          credentialId,
          messages,
          cutPosition,
        },
        (state) => {
          // Stream content and update criteria list
          if (state.content.criteria && state.content.criteria.length > 0) {
            const validCriteria = state.content.criteria.filter(
              Boolean,
            ) as string[];
            if (validCriteria.length > 0) {
              setNaturalLanguageCriteria(validCriteria);
            }
          }
        },
        abortControllerRef.current.signal,
      );

      setIsGenerating(false);
      toast.success("Test criteria generated successfully!");
    } catch (error) {
      setIsGenerating(false);
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to generate criteria:", error);
        toast.error("Failed to generate criteria. Please try again.");
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    toast.info("Generation stopped");
  };

  const showAISection = model && credentialId && !isAtEnd;

  return (
    <div className="space-y-8">
      {/* Warning for end-of-conversation cuts */}
      {isAtEnd && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200">
                No Output to Evaluate
              </h4>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Test criteria cannot be defined because the cut position is at
                the end of the conversation. There are no assistant responses
                after the cut to evaluate against success criteria.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Generation Section */}
      {showAISection && (
        <AIGenerationSection
          icon={<Target className="text-primary h-5 w-5" />}
          title="Generate Success Criteria"
          subtitle="Automatically create test criteria by analyzing conversation outputs"
          isGenerating={isGenerating}
          onGenerate={handleGenerateCriteria}
          onStop={handleStopGeneration}
        />
      )}

      {/* Manual Entry Section */}
      <div
        className={`space-y-6 ${isAtEnd ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="space-y-4">
          <div className="space-y-3">
            <Textarea
              id="criterion-input"
              value={newCriterion}
              onChange={(e) => setNewCriterion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'The response should contain specific technical details about the implementation' or 'The assistant should ask for clarification when requirements are unclear'"
              rows={3}
              className="resize-none text-base transition-all focus:ring-2"
              disabled={isAtEnd}
            />

            <Button
              type="button"
              onClick={handleAddCriterion}
              disabled={!newCriterion.trim() || isAtEnd}
              className="w-full transition-all hover:shadow-md"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Criterion
            </Button>
          </div>
        </div>

        {/* Criteria List */}
        {naturalLanguageCriteria.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div>
                <Label className="text-base font-medium">
                  Success Criteria
                </Label>
                <p className="text-muted-foreground text-sm">
                  These criteria will be used to evaluate conversation success
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {naturalLanguageCriteria.map((criterion, index) => (
                <div
                  key={index}
                  className="group bg-card hover:bg-muted/50 relative rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 text-sm">{criterion}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCriterion(index)}
                      className="text-muted-foreground hover:text-destructive h-6 w-6 flex-shrink-0 p-0 opacity-0 transition-all group-hover:opacity-100"
                      disabled={isAtEnd}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {naturalLanguageCriteria.length === 0 && !isAtEnd && (
          <div className="rounded-xl border-2 border-dashed p-8 text-center">
            <div className="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Target className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="text-muted-foreground mb-2 font-medium">
              No criteria added yet
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
