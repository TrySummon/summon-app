import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/Loader";

interface LoadingStateProps {
  onCancel: () => void;
}

export function LoadingState({ onCancel }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader className="mb-4 h-8 w-8" />
      <p className="text-muted-foreground mb-6 text-lg">Figuring it out...</p>
      <Button variant="outline" onClick={onCancel} className="gap-2">
        <X className="h-4 w-4" />
        Cancel
      </Button>
    </div>
  );
}
