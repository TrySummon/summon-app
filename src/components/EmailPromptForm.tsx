import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";

interface EmailPromptFormProps {
  featureName: string;
  onCancel: () => void;
  onSubmit: (email: string) => void;
  descriptionText?: string;
  submitButtonText?: string;
}

export default function EmailPromptForm({
  featureName,
  onCancel,
  onSubmit,
  descriptionText,
  submitButtonText = "Notify Me",
}: EmailPromptFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("waitlist_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmail(email)) return;

    setIsSubmitting(true);
    setError("");

    try {
      localStorage.setItem("waitlist_email", email.trim());
      onSubmit(email.trim());
      onCancel(); // This will close the dialog
    } catch (err) {
      setError("Failed to submit email. Please try again.");
      console.error("Email submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader className="space-y-3">
        <DialogTitle>Feature Coming Soon!</DialogTitle>
        <DialogDescription className="text-base">
          {descriptionText ||
            `The ${featureName} feature is not available yet, but
            we're working on it! Enter your email to get notified when it's
            ready.`}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-6 pt-2">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-sm font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-10"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !email.trim() || !isValidEmail(email)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
