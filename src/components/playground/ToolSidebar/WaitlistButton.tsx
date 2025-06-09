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
import { Loader2, CheckCircle } from "lucide-react";
import { captureEvent } from "@/lib/posthog";

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
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Check if PostHog is configured (always available since it's already set up)
  const isConfigured = Boolean(process.env.VITE_PUBLIC_POSTHOG_KEY);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Load saved email from localStorage
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
      // Capture waitlist signup event in PostHog
      captureEvent("waitlist_signup", {
        feature_name: featureName,
        email: email.trim(),
        timestamp: new Date().toISOString(),
      });

      // Save email to localStorage for future use
      localStorage.setItem("waitlist_email", email.trim());

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
      }, 2000);
    } catch (err) {
      setError("Failed to submit email. Please try again.");
      console.error("Waitlist submission error:", err);
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
        <Button variant="outline" size="sm" {...props}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Feature Coming Soon!</DialogTitle>
          <DialogDescription>
            The <strong>{featureName}</strong> feature is not available yet, but
            we're working on it! Enter your email to get notified when it's
            ready.
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-500" />
              <p className="text-muted-foreground text-sm">
                Thanks! We'll notify you when {featureName} is ready.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
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
                disabled={isSubmitting || !email.trim() || !isValidEmail(email)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Notify Me"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
