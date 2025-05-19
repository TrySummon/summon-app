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

export default function CodeSnippet({ ...props }: CodeProps) {
    const codeChildren = props.node?.children?.[0];
    const className = codeChildren?.properties?.className?.[0];
    const match = /language-(\w+)/.exec(className || '');
    const code = codeChildren?.children?.[0]?.value;  
  
  
    return (
      <Card className="relative my-2 py-0 gap-2">
        <CardHeader className="flex flex-row items-center justify-between py-1 px-4">
          <span className="text-sm text-muted-foreground">
            {match?.[1] || 'Raw code'}
          </span>
          <CopyButton content={code} />
        </CardHeader>
        <CardContent className="py-0 px-4">
          <CodeMirrorEditor defaultValue={code} language={match?.[1]} readOnly />
        </CardContent>
      </Card>
    );
  }