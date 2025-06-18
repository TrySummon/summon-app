import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  TestTubeDiagonal,
  AlertTriangle,
} from "lucide-react";
import { AssertionResult } from "./AssertionResult";
import { EvaluationResult } from "@/lib/evaluation";

interface EvaluationResultItemProps {
  result: EvaluationResult;
}

export function EvaluationResultItem({ result }: EvaluationResultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const passedAssertions = result.assertions.filter((a) => a.passed).length;
  const totalAssertions = result.assertions.length;

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={`mb-4 ${result.passed ? "border-green-200" : "border-red-200"}`}
    >
      <Collapsible>
        <CollapsibleTrigger className="w-full" onClick={toggleExpansion}>
          <CardHeader className="hover:bg-muted/50 py-4 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {result.passed ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div className="text-left">
                  <CardTitle className="text-lg font-semibold">
                    {result.itemName}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-4 text-base">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{result.executionTime}ms</span>
                    </div>
                    {totalAssertions > 0 && (
                      <div className="flex items-center gap-1">
                        <TestTubeDiagonal className="h-4 w-4" />
                        <span>
                          {passedAssertions}/{totalAssertions} passed
                        </span>
                      </div>
                    )}
                  </CardDescription>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-6">
            {result.error && (
              <Alert className="mb-6" variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-base">
                  {result.error}
                </AlertDescription>
              </Alert>
            )}

            {result.assertions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center border-b pb-2">
                  <h4 className="text-lg font-semibold">Test Assertions</h4>
                </div>
                <div className="space-y-4">
                  {result.assertions.map((assertion, index) => (
                    <AssertionResult key={index} assertion={assertion} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
