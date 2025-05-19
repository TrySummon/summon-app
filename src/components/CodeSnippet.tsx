import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CodeMirrorEditor from "./CodeEditor";
import CopyButton from "./CopyButton";

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
    const match = /language-(\w+)/.exec(className || '');
    const code = codeChildren?.children?.[0]?.value;  
    return <CodeSnippet children={code || ""} language={match?.[1]} />;
}

interface CodeSnippetProps {
    children: string;
    language?: string;
    title?: string;
}

export function CodeSnippet({ children, language, title }: CodeSnippetProps) {
    return (
      <Card className="relative my-2 py-0 gap-2 bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between py-1 px-4">
          <span className="text-sm text-muted-foreground">
            {title || language || 'Code'}
          </span>
          <CopyButton content={children} />
        </CardHeader>
        <CardContent className="py-0 px-4">
          <CodeMirrorEditor defaultValue={children} language={language} readOnly />
        </CardContent>
      </Card>
    );
  }