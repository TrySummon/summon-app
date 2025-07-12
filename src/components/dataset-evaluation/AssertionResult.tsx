import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import CodeEditor from "@/components/CodeEditor";
import { AssertionResult as AssertionResultType } from "@/lib/evaluation";

interface AssertionResultProps {
  assertion: AssertionResultType;
}

export function AssertionResult({ assertion }: AssertionResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actualValueStr = formatActualValue(assertion.actualValue);
  const isLongValue = actualValueStr.length > 200;

  function getAssertionTypeLabel(type: string) {
    switch (type) {
      case "llm_criteria_met":
        return "Criteria Check";
      case "tool_called":
        return "Tool Call";
      case "semantic_contains":
        return "Semantic Match";
      case "equals":
        return "Exact Match";
      case "exists":
        return "Value Exists";
      case "not_exists":
        return "Value Missing";
      default:
        return type;
    }
  }

  function formatActualValue(value: unknown): string {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object") {
      const str = JSON.stringify(value, null, 2);
      return str;
    }

    return String(value);
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        assertion.passed
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {assertion.passed ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <div>
            <Badge variant="outline" className="text-sm">
              {getAssertionTypeLabel(assertion.assertion.assertionType)}
            </Badge>
          </div>
        </div>
        <Badge
          variant={assertion.passed ? "default" : "destructive"}
          className="px-3 py-1 text-sm"
        >
          {assertion.passed ? "PASS" : "FAIL"}
        </Badge>
      </div>

      <div className="space-y-3">
        {assertion.assertion.value && (
          <div>
            <div className="text-foreground mb-1 text-sm font-medium">
              Expected:
            </div>
            <div className="bg-card text-card-foreground rounded border p-3 text-sm">
              {assertion.assertion.value}
            </div>
          </div>
        )}

        {assertion.reason && (
          <div>
            <div className="text-foreground mb-1 text-sm font-medium">
              Reason:
            </div>
            <div className="bg-card text-card-foreground rounded border p-3 text-sm">
              {assertion.reason}
            </div>
          </div>
        )}

        {assertion.actualValue !== undefined && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <div className="text-foreground text-sm font-medium">
                Actual Value:
              </div>
              {isLongValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs"
                >
                  {isExpanded ? "Show Less" : "Show More"}
                </Button>
              )}
            </div>
            <div className="bg-background rounded border p-2">
              <CodeEditor
                defaultValue={
                  isExpanded
                    ? JSON.stringify(assertion.actualValue, null, 2)
                    : actualValueStr
                }
                language="json"
                readOnly={true}
                height={isExpanded ? "auto" : 100}
                maxHeight={isExpanded ? 400 : 100}
                fontSize={12}
                className="min-h-[100px] overflow-y-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
