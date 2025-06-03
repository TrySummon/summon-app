import React from "react";
import { Clock, Check, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/tailwind";
import { ToolInvocation } from "ai";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeSnippet } from "@/components/CodeSnippet";

interface ToolCallProps {
  invocation: ToolInvocation;
}

export const ToolCall: React.FC<ToolCallProps> = ({ invocation }) => {
  // Determine the status badge based on the state
  const renderStatusBadge = () => {
    switch (invocation.state) {
      case "partial-call":
        return (
          <Badge
            variant="outline"
            className="border-yellow-300 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
          >
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "call":
        return (
          <Badge
            variant="outline"
            className="border-blue-300 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
          >
            <Clock className="mr-1 h-3 w-3" />
            Processing
          </Badge>
        );
      case "result":
        if (invocation.result.success) {
          return (
            <Badge
              variant="outline"
              className="border-green-300 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
            >
              <Check className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          );
        } else {
          return (
            <Badge
              variant="outline"
              className="border-red-300 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
            >
              Failed
            </Badge>
          );
        }
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex w-full items-center justify-between">
          <div className="text-foreground flex items-center gap-2 text-sm font-medium">
            <Wrench className="h-3.5 w-3.5" /> {invocation.toolName}
          </div>
          {invocation.step !== undefined && (
            <Badge variant="secondary" className="text-xs">
              Step {invocation.step}
            </Badge>
          )}
          {renderStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <Accordion type="single" collapsible className="w-full">
        {/* Arguments Section */}
        <AccordionItem value="arguments" className="border-none">
          <AccordionTrigger className="py-2">
            <span className="text-muted-foreground text-sm font-medium">
              Arguments
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="overflow-hidden rounded-md">
              <CodeSnippet language="json">
                {JSON.stringify(invocation.args, null, 2)}
              </CodeSnippet>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Result Section - Only show for result state */}
        {invocation.state === "result" && (
          <AccordionItem value="result" className="border-none">
            <AccordionTrigger className="py-2">
              <span className="text-muted-foreground text-sm font-medium">
                Result
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div
                className={cn(
                  "overflow-hidden rounded-md",
                  typeof invocation.result === "object"
                    ? ""
                    : "bg-muted p-3 text-sm",
                )}
              >
                {typeof invocation.result === "object" ? (
                  <CodeSnippet language="json">
                    {JSON.stringify(invocation.result, null, 2)}
                  </CodeSnippet>
                ) : (
                  <div className="font-mono text-sm whitespace-pre-wrap">
                    {String(invocation.result)}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};

export default ToolCall;
