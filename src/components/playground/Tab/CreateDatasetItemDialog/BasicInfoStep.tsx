import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePlaygroundStore } from "../../store";
import { generateBasicInfo } from "./prefillGenerator";
import { AIGenerationSection } from "./AIGenerationSection";
import { MessageSquare } from "lucide-react";

interface BasicInfoStepProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  messages: import("ai").UIMessage[];
  cutPosition: number;
}

export function BasicInfoStep({
  name,
  setName,
  description,
  setDescription,
  messages,
  cutPosition,
}: BasicInfoStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get current model configuration
  const model = usePlaygroundStore((state) => state.getCurrentState().model);
  const credentialId = usePlaygroundStore(
    (state) => state.getCurrentState().credentialId,
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (!model || !credentialId) {
      toast.error("Please configure a model and credential first");
      return;
    }

    // Abort any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);

    try {
      await generateBasicInfo(
        {
          model,
          credentialId,
          messages,
          cutPosition,
        },
        (state) => {
          // Stream content directly to form fields
          if (state.content.name) {
            setName(state.content.name);
          }
          if (state.content.description) {
            setDescription(state.content.description);
          }
        },
        abortControllerRef.current.signal,
      );

      setIsGenerating(false);
      toast.success("Name and description generated successfully!");
    } catch (error) {
      setIsGenerating(false);
      if ((error as Error).name !== "AbortError") {
        console.error("Failed to generate basic info:", error);
        toast.error("Failed to generate content. Please try again.");
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

  const showAISection = model && credentialId;

  return (
    <div className="space-y-6">
      {/* AI Generation Section */}
      {showAISection && (
        <AIGenerationSection
          icon={<MessageSquare className="text-primary h-5 w-5" />}
          title="Generate Dataset Item Details"
          subtitle="Automatically create a name and description by analyzing the conversation context"
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onStop={handleStopGeneration}
        />
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-base font-medium">
            Dataset Item Name *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a descriptive name for this test case..."
            className="h-12 text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-base font-medium">
            Dataset Item Description
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this conversation tests or demonstrates..."
            rows={4}
            className="resize-none text-base"
          />
        </div>
      </div>
    </div>
  );
}
