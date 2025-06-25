import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles, Wrench, Workflow, FileText } from "lucide-react";
import { useAgentContext } from "./AgentContext";

const starters = [
  {
    icon: FileText,
    title: "Build MCP from API spec",
    prompt: "Help me build an MCP out of my API spec",
    description:
      "Convert your OpenAPI specification into a Model Context Protocol server",
  },
  {
    icon: Wrench,
    title: "Improve MCP tools",
    prompt: "Help me improve my MCP tools",
    description: "Optimize and enhance your existing MCP tool implementations",
  },
  {
    icon: Workflow,
    title: "Create new workflows",
    prompt: "Help me create new workflows",
    description: "Design and implement automated workflows for your processes",
  },
  {
    icon: Sparkles,
    title: "Explore capabilities",
    prompt: "What can you help me with?",
    description:
      "Discover all the ways I can assist with your development tasks",
  },
];

export function ChatStarters() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { handleStarterClick: onStarterClick } = useAgentContext();

  return (
    <div className="flex flex-1 flex-col justify-center">
      <div className="space-y-2">
        <div className="mb-3 text-center">
          <h3 className="text-foreground font-medium">
            How can I help you today?
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          {starters.map((starter, index) => {
            const IconComponent = starter.icon;
            const isHovered = hoveredIndex === index;
            return (
              <Card
                key={index}
                className={`bg-card/20 cursor-pointer px-2 py-2 transition-all duration-200 ${
                  isHovered ? "border-primary/50" : ""
                }`}
                onClick={() => onStarterClick(starter.prompt)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors ${
                      isHovered ? "bg-primary/20" : "bg-primary/10"
                    }`}
                  >
                    <IconComponent className="text-primary h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4
                      className={`text-xs font-medium transition-colors ${
                        isHovered ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {starter.title}
                    </h4>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
