import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EvaluationResultItem } from "./EvaluationResultItem";
import { EvaluationSummary } from "@/lib/evaluation/runner";

interface EvaluationResultsProps {
  results: EvaluationSummary | null;
}

export function EvaluationResults({ results }: EvaluationResultsProps) {
  if (!results) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Results</CardTitle>
          <CardDescription>Completed in {results.duration}ms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results.passedTests}
              </div>
              <div className="text-muted-foreground text-sm">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {results.failedTests}
              </div>
              <div className="text-muted-foreground text-sm">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{results.totalTests}</div>
              <div className="text-muted-foreground text-sm">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Results */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Test Results</h3>
        {results.results.map((result, index) => (
          <EvaluationResultItem key={index} result={result} />
        ))}
      </div>
    </div>
  );
}
