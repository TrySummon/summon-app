import React, { useState } from "react";
import { generateText } from 'ai';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AIProviderCredential, AI_PROVIDERS_CONFIG } from "./types";
import { createLLMProvider } from "@/helpers/llm";
import { Loader } from "../Loader";

export const TestProviderButton = ({
  credential,
  disabled,
}: {
  credential: AIProviderCredential;
  disabled?: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState<'unknown' | 'success' | 'failed'>('unknown');
  
  const config = AI_PROVIDERS_CONFIG[credential.provider];
  const model = config.defaultModel || credential.models?.[0];
  
  if (!model) {
    return (
      <Button type="button" variant="secondary" disabled>
        No model available
      </Button>
    );
  }

  const testProvider = async () => {
    try {
      setIsLoading(true);
      setIsSuccess('unknown');
      
      const llmProvider = createLLMProvider(credential);
      const llm = llmProvider(model);
      
      // Simple test prompt to verify the provider works
      const response = await generateText({
        model: llm, 
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message. Please respond with 'OK' if you receive this.",
          },
        ],
        maxTokens: 50,
      });
      
      if (response) {
        setIsSuccess('success');
        toast.success(`Successfully connected to ${credential.provider}`);
      } else {
        setIsSuccess('failed');
        toast.error(`Failed to connect to ${credential.provider}`);
      }
    } catch (error) {
      console.error('Provider test failed:', error);
      setIsSuccess('failed');
      toast.error(
        error instanceof Error 
          ? `Test failed: ${error.message}` 
          : `Failed to connect to ${credential.provider}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const bgColor = {
    unknown: "",
    failed: "bg-red-500 hover:bg-red-600",
    success: "bg-green-400 hover:bg-green-500",
  }[isSuccess];

  const txtColor = {
    unknown: "",
    failed: "text-white",
    success: "text-white",
  }[isSuccess];

  return (
    <Button
      type="button"
      variant="secondary"
      className={`${bgColor} ${txtColor} transition-colors duration-200 gap-2`}
      onClick={testProvider}
      disabled={disabled || isLoading}
      aria-label="Test AI provider connection"
    >
      {isLoading ? (
        <>
          <Loader />
          Testing...
        </>
      ) : (
        "Test"
      )}
    </Button>
  );
};
