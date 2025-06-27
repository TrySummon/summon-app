import React, { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { captureEvent } from "@/lib/posthog";
import EmailPromptForm from "../EmailPromptForm";
import { toast } from "sonner";

interface WaitlistButtonProps extends ButtonProps {
  featureName: string;
  children: React.ReactNode;
}

export default function WaitlistButton({
  featureName,
  children,
  ...props
}: WaitlistButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if PostHog is configured (always available since it's already set up)
  const isConfigured = Boolean(process.env.VITE_PUBLIC_POSTHOG_KEY);

  const handleSubmit = (email: string) => {
    captureEvent("waitlist_signup", {
      feature_name: featureName,
      email: email.trim(),
      timestamp: new Date().toISOString(),
    });
    toast.success("Thanks for your interest. We'll be in touch shortly.");
  };

  if (!isConfigured) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" {...props}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <EmailPromptForm
          featureName={featureName}
          onSubmit={handleSubmit}
          onCancel={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
