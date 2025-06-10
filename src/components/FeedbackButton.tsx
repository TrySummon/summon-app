import React, { useState, useEffect } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, MessageSquare } from "lucide-react";
import { captureEvent } from "@/lib/posthog";

interface FeedbackButtonProps extends ButtonProps {
  children: React.ReactNode;
}

export default function FeedbackButton({
  children,
  ...props
}: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Check if PostHog is configured
  const isConfigured = Boolean(process.env.VITE_PUBLIC_POSTHOG_KEY);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Load saved email from localStorage
  useEffect(() => {
    const savedEmail =
      localStorage.getItem("feedback_email") ||
      localStorage.getItem("waitlist_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || (email.trim() && !isValidEmail(email))) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Capture feedback event in PostHog
      captureEvent("feedback_submitted", {
        feedback: feedback.trim(),
        email: email.trim() || "anonymous",
        timestamp: new Date().toISOString(),
        feedback_length: feedback.trim().length,
      });

      // Save email to localStorage for future use if provided
      if (email.trim()) {
        localStorage.setItem("feedback_email", email.trim());
      }

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        setFeedback("");
        setEmail(email); // Keep email for next time
      }, 2000);
    } catch (err) {
      setError("Failed to submit feedback. Please try again.");
      console.error("Feedback submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render if PostHog is not configured
  if (!isConfigured) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" {...props}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <DialogTitle>Give Feedback</DialogTitle>
          <DialogDescription className="text-base">
            Help us improve by sharing your thoughts or suggestions. For bug
            reports, you can also{" "}
            <a
              href="https://github.com/TrySummon/summon-app/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              open a GitHub issue
            </a>
            .
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex items-center justify-center py-8">
            <div className="space-y-3 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p className="text-muted-foreground">
                Thanks for your feedback! We appreciate your input.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div className="space-y-3">
              <Label htmlFor="feedback" className="text-sm font-medium">
                Your feedback <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="feedback"
                placeholder="Tell us what you think, what could be improved, or report any issues..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="email" className="text-sm font-medium">
                Email address (optional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10"
              />
              <p className="text-muted-foreground text-xs">
                Leave your email if you'd like us to follow up with you.
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !feedback.trim() ||
                  (email.trim() !== "" && !isValidEmail(email))
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
