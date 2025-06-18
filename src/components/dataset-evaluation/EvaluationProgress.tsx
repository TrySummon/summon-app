import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface EvaluationProgressProps {
  progress: {
    completed: number;
    total: number;
    currentItem: string;
  } | null;
}

export function EvaluationProgress({ progress }: EvaluationProgressProps) {
  if (!progress) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Running Evaluation</h3>
            <span className="text-muted-foreground text-sm">
              {progress.completed}/{progress.total}
            </span>
          </div>
          <Progress value={(progress.completed / progress.total) * 100} />
          {progress.currentItem && (
            <p className="text-muted-foreground text-sm">
              Evaluating: {progress.currentItem}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
