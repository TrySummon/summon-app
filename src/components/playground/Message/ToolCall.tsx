import React from "react";
import { Clock, Check, Wrench } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import CodeEditor from "@/components/CodeEditor";
import { cn } from "@/utils/tailwind";
import { ToolInvocation } from "ai";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ToolCallProps {
  invocation: ToolInvocation;
}

export const ToolCall: React.FC<ToolCallProps> = ({ invocation }) => {


  // Determine the status badge based on the state
  const renderStatusBadge = () => {
    switch (invocation.state) {
      case 'partial-call':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'call':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 border-blue-300"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'result':
        return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-300"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center justify-between w-full">
          <div className="font-medium text-sm text-foreground flex gap-1 items-center"><Wrench className="h-3.5 w-3.5" /> {invocation.toolName}</div>
          {invocation.step !== undefined && (
            <Badge variant="secondary" className="text-xs">Step {invocation.step}</Badge>
          )}
          {renderStatusBadge()}
        </div>

      </div>

      {/* Content */}
      <Accordion type="single" collapsible className="w-full">
        {/* Arguments Section */}
        <AccordionItem value="arguments" className="border-none">
          <AccordionTrigger className="py-2">
            <span className="text-sm font-medium text-muted-foreground">Arguments</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md overflow-hidden">
              <CodeEditor
                defaultValue={JSON.stringify(invocation.args, null, 2)}
                language="json"
                readOnly
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Result Section - Only show for result state */}
        {invocation.state === 'result' && (
          <AccordionItem value="result" className="border-none">
            <AccordionTrigger className="py-2">
              <span className="text-sm font-medium text-muted-foreground">Result</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className={cn(
                "rounded-md overflow-hidden",
                typeof invocation.result === 'object' ? "" : "p-3 bg-muted text-sm"
              )}>
                {typeof invocation.result === 'object' ? (
                  <CodeEditor
                    defaultValue={JSON.stringify(invocation.result, null, 2)}
                    language="json"
                    readOnly
                  />
                ) : (
                  <div className="whitespace-pre-wrap font-mono text-sm">
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
