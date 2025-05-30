import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import CodeMirrorEditor from "./CodeEditor";
import CopyButton from "./CopyButton";
import { cn } from "@/utils/tailwind";

export interface CodeTab {
  label: string;
  value: string;
  code: string;
  language?: string;
  description?: string;
}

interface TabbedCodeSnippetProps {
  tabs: CodeTab[];
  defaultValue?: string;
  className?: string;
  maxHeight?: string;
}

export function TabbedCodeSnippet({ 
  tabs, 
  defaultValue, 
  className,
  maxHeight 
}: TabbedCodeSnippetProps) {
  const [activeTab, setActiveTab] = React.useState<string>(defaultValue || tabs[0]?.value);
  
  const activeTabData = tabs.find(tab => tab.value === activeTab) || tabs[0];
  
  return (
    <Card className={cn("relative w-full py-0 gap-2 bg-accent/10", className)}>
      <CardHeader className="flex flex-row items-center justify-between py-1 px-4">
        <div className="flex items-center space-x-2">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "text-xs hover:text-foreground transition-colors",
                  activeTab === tab.value 
                    ? "text-foreground border-b border-foreground" 
                    : "text-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <CopyButton content={activeTabData.code} />
      </CardHeader>
      <CardContent className="py-0 px-4">
        <CodeMirrorEditor 
          maxHeight={maxHeight} 
          defaultValue={activeTabData.code} 
          language={activeTabData.language} 
          readOnly 
        />
      </CardContent>
    </Card>
  );
}
