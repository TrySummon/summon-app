import { MessageSquare, Target, Wrench, CheckCircle } from "lucide-react";

export const STEPS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Name and describe your dataset item",
    icon: MessageSquare,
  },
  {
    id: "criteria",
    title: "Test Criteria",
    description: "Define success criteria (optional)",
    icon: Target,
  },
  {
    id: "tools",
    title: "Expected Tools",
    description: "Select expected tool calls (optional)",
    icon: Wrench,
  },
  {
    id: "review",
    title: "Review & Create",
    description: "Review your configuration",
    icon: CheckCircle,
  },
];
