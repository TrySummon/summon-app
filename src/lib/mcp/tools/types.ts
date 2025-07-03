import { JSONSchema7 } from "json-schema";
import { MappingConfig } from "@/lib/mcp/tools/mapper";
import type { Message } from "ai";

/**
 * Annotations that provide metadata about a tool
 */
export interface ToolAnnotations {
  /** Token count of the original tool definition */
  tokenCount?: number;
  /** Token count of the optimized tool definition */
  optimisedTokenCount?: number;
  /** Original tool ID (without prefix) */
  id: string;
  /** Tool prefix applied to the name */
  prefix?: string;
  /** Whether this is an external MCP tool */
  isExternal?: boolean;
  /** API ID if this tool comes from an API */
  apiId?: string;
  /** Original tool definition before optimization */
  originalDefinition?: ToolDefinition;
}

/**
 * Core tool definition structure
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  annotations?: ToolAnnotations;
}

/**
 * External tool override configuration
 */
export interface ExternalToolOverride {
  mcpId: string;
  originalToolName: string;
  definition: ToolDefinition;
  mappingConfig?: MappingConfig;
}

/**
 * Complete tool information for Summon
 */
export interface SummonTool {
  apiId?: string;
  mappingConfig?: MappingConfig;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
  definition: ToolDefinition;
}

/**
 * Tool reference without full definition
 */
export interface SummonToolRef {
  apiId?: string;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
}

/**
 * Request to optimize tool size
 */
export interface OptimizeToolSizeRequest {
  mcpId: string;
  apiId?: string;
  toolName: string;
  additionalGoal?: string;
}

/**
 * Request to optimize tool selection based on context
 */
export interface OptimizeToolSelectionRequest {
  context: string;
  messagesPriorToToolCall: Message[];
  tools: SummonTool[];
}

/**
 * Result from tool selection optimization
 */
export interface OptimizeToolSelectionResult {
  original: SummonTool[];
  optimised: SummonTool[];
}

/**
 * Tool update request
 */
export interface UpdateToolRequest {
  apiId?: string;
  mappingConfig?: MappingConfig;
  mcpId: string;
  isExternal: boolean;
  originalToolName: string;
  definition: ToolDefinition;
}

// Re-export types from ai package that we use
export type { Message } from "ai";
