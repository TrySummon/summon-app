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
  maxHeight,
}: TabbedCodeSnippetProps) {
  const [activeTab, setActiveTab] = React.useState<string>(
    defaultValue || tabs[0]?.value,
  );

  const activeTabData = tabs.find((tab) => tab.value === activeTab) || tabs[0];

  return (
    <Card className={cn("bg-accent/10 relative w-full gap-2 py-0", className)}>
      <CardHeader className="flex flex-row items-center justify-between px-4 py-1">
        <div className="flex items-center space-x-2">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "hover:text-foreground text-xs transition-colors",
                  activeTab === tab.value
                    ? "text-foreground border-foreground border-b"
                    : "text-muted-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <CopyButton content={activeTabData.code} />
      </CardHeader>
      <CardContent className="px-4 py-0">
        <CodeMirrorEditor
          maxHeight={maxHeight}
          defaultValue={activeTabData.code}
          value={activeTabData.code}
          language={activeTabData.language}
          readOnly
        />
      </CardContent>
    </Card>
  );
}
