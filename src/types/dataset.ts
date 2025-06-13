import { UIMessage } from "ai";
import { LLMSettings } from "@/components/playground/tabState";

/**
 * An item within a dataset, representing a single conversation or run.
 */
export interface DatasetItem {
  id: string;
  name: string;
  messages: UIMessage[];
  systemPrompt?: string;
  model?: string;
  settings: LLMSettings;
  createdAt: string;
  updatedAt: string;
  description?: string;
  // Expectations for testing and validation
  naturalLanguageCriteria?: string[];
  expectedToolCalls?: string[];
  inputOutputCutPosition?: number;
}

/**
 * A dataset is a collection of items.
 */
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  items: DatasetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetMetadata {
  itemCount: number;
  lastItemAt?: string;
}
