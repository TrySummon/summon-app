import { UIMessage } from "ai";
import { LLMSettings } from "@/components/playground/tabState";

export interface DatasetItem {
  id: string;
  name: string;
  messages: UIMessage[];
  systemPrompt?: string;
  model?: string;
  settings: LLMSettings;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  description?: string;
}

export interface DatasetMetadata {
  messageCount: number;
  tokenCount?: number;
  lastMessageAt?: string;
}
