import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CodeMirrorEditor from "./CodeEditor";
import CopyButton from "./CopyButton";
import { cn } from "@/utils/tailwind";

interface CodeProps {
  children: React.ReactNode;
  node?: {
    children?: Array<{
      properties?: {
        className?: string[];
      };
      children?: Array<{
        value?: string;
      }>;
    }>;
  };
}

export function MarkdownCodeSnippet({ ...props }: CodeProps) {
  const codeChildren = props.node?.children?.[0];
  const className = codeChildren?.properties?.className?.[0];
  const match = /language-(\w+)/.exec(className || "");
  const code = codeChildren?.children?.[0]?.value;
  return (
    <CodeSnippet className="my-2" language={match?.[1]}>
      {code || ""}
    </CodeSnippet>
  );
}

interface CodeSnippetProps {
  children: string;
  language?: string;
  title?: string;
  maxHeight?: string;
  className?: string;
}

export function CodeSnippet({
  children,
  className,
  language,
  title,
  maxHeight,
}: CodeSnippetProps) {
  return (
    <Card className={cn("bg-accent/10 relative w-full gap-2 py-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-1">
        <span className="text-muted-foreground text-sm">
          {title || language || "Code"}
        </span>
        <CopyButton content={children} />
      </CardHeader>
      <CardContent className="px-4 py-0">
        <CodeMirrorEditor
          maxHeight={maxHeight}
          defaultValue={children}
          language={language}
          readOnly
        />
      </CardContent>
    </Card>
  );
}
