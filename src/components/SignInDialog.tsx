import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Workflow, Sparkles, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const { authenticate, isLoading } = useAuth();

  const handleSignIn = async () => {
    try {
      await authenticate();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the useAuth hook
      console.error("Sign in failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src="/images/icon.png" alt="Summon" className="h-16 w-16" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Sign in to use Summon's AI features
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-center text-sm">
            Get AI assistance to build, improve, and explore your MCP tools and
            workflows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Features list */}
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <Sparkles className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium">
                  Build MCP servers from API specs
                </div>
                <div className="text-muted-foreground text-xs">
                  Convert OpenAPI specifications automatically
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <Wrench className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Improve and optimize tools</div>
                <div className="text-muted-foreground text-xs">
                  Get AI assistance for better implementations
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                <Workflow className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Create custom workflows</div>
                <div className="text-muted-foreground text-xs">
                  Design automated processes with AI guidance
                </div>
              </div>
            </div>
          </div>

          {/* Sign in button */}
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? "Signing in..." : "Sign in to Continue"}
          </Button>

          <p className="text-muted-foreground text-center text-xs">
            By signing in, you agree to our terms of service and privacy policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
