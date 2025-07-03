import { SummonTool } from "@/lib/mcp/tools/types";
import type { JSONSchema7 } from "json-schema";

export interface MentionedTool {
  apiId?: string;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
  definition: {
    name: string;
    description: string;
    inputSchema: JSONSchema7;
  };
}

export interface OptimizedResult {
  original: SummonTool[];
  optimised: SummonTool[];
}

export type DialogState = "composer" | "loading" | "merge";
