import * as React from "react"
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { cn } from "@/utils/tailwind";

interface Props {
  content: unknown;
  className?: string;
}

const CopyButton = ({ content, className }: Props) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      const textToCopy =
        typeof content === 'object'
          ? JSON.stringify(content, null, 2)
          : String(content);

      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      toast.error('Failed to copy: ' + String(err));
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={copyToClipboard}
            variant="ghost"
            size="icon"
            className={"text-muted-foreground"}
          >
            {copied ? (
              <Check className={cn("h-4 w-4", className)} />
            ) : (
              <Copy className={cn("h-4 w-4", className)} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {copied
              ? 'Copied to clipboard'
              : 'Copy'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CopyButton;
