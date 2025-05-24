import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransportOptions } from "@modelcontextprotocol/sdk/client/sse.js";
import { ChildProcess } from "child_process";
import { MockApiResult } from "../mock";

// Define the status types for MCP servers
export type McpServerStatus = 'starting' | 'running' | 'error' | 'stopped';

/**
 * Configuration options for MCP tools
 */
export type McpTransport = 
  | { type: 'stdio'; params: StdioServerParameters }
  | { type: 'http'; url: string; options?: StreamableHTTPClientTransportOptions }
  | { type: 'sse'; url: string; options?: SSEClientTransportOptions };

// Define the structure for tracking MCP server state
export interface McpServerState {
  mcpId: string;
  status: McpServerStatus;
  error?: string;
  serverProcess?: ChildProcess;
  mockProcesses: Record<string, MockApiResult>;
  transport?: McpTransport
  client?: Client
  startedAt: Date;
  stoppedAt?: Date;
}

// Global state to track running MCP servers
export const runningMcpServers: Record<string, McpServerState> = {};
