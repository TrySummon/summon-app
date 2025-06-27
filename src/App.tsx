import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "@/lib/theme_helpers";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OpenAPIV3 } from "openapi-types";
import type { McpData, McpSubmitData } from "@/lib/db/mcp-db";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { McpServerState } from "@/lib/mcp/state";
import {
  AIProviderCredential,
  PersistedAIProviderCredential,
} from "./components/ai-providers/types";
import { McpAuth } from "./components/mcp-builder/api-config";
import { initPostHog } from "@/lib/posthog";
import { initSentryRenderer } from "@/lib/sentry-renderer";
import { SentryErrorBoundary } from "./components/SentryErrorBoundary";
import { Dataset, DatasetItem } from "@/types/dataset";
import type { UserInfo } from "./ipc/auth/auth-listeners";
import { SelectedEndpoint } from "./lib/mcp/parser/extract-tools";
import { McpToolDefinitionWithoutAuth } from "./lib/mcp/types";
import { ToolResult } from "./components/AgentSidebar/AgentContext";

export default function App() {
  useEffect(() => {
    syncThemeWithLocal();
    initPostHog();
    initSentryRenderer();
  }, []);

  return (
    <SentryErrorBoundary>
      <RouterProvider router={router} />
    </SentryErrorBoundary>
  );
}

const queryClient = new QueryClient();

// Define the interface for the electron API
declare global {
  interface Window {
    require: (module: string) => unknown;
    openapi: {
      db: {
        listApis: () => Promise<{
          success: boolean;
          apis?: {
            id: string;
            api: OpenAPIV3.Document;
          }[];
          message?: string;
        }>;
        getApi: (id: string) => Promise<{
          success: boolean;
          api?: {
            id: string;
            api: OpenAPIV3.Document;
          };
          message?: string;
        }>;
        renameApi: (
          id: string,
          newName: string,
        ) => Promise<{
          success: boolean;
          message: string;
        }>;
        deleteApi: (id: string) => Promise<{
          success: boolean;
          message: string;
        }>;
      };
      convertEndpointToTool: (
        apiId: string,
        endpoint: SelectedEndpoint,
      ) => Promise<{
        success: boolean;
        data?: McpToolDefinitionWithoutAuth;
        message?: string;
      }>;
      import: (file: File) => Promise<{
        success: boolean;
        message: string;
        apiId?: string;
      }>;
    };
    auth: {
      testCredentials: (
        baseUrl: string,
        authData: McpAuth,
      ) => Promise<{ status: number; success: boolean; message?: string }>;
      // OAuth methods
      authenticate: () => Promise<{
        success: boolean;
        token?: string;
        user?: UserInfo;
        message?: string;
      }>;
      getUser: () => Promise<{
        success: boolean;
        user?: UserInfo;
        token?: string;
        message?: string;
      }>;
      logout: () => Promise<{ success: boolean }>;
    };
    aiProviders: {
      getCredentials: () => Promise<PersistedAIProviderCredential[]>;
      saveCredential: (
        id: string,
        providerData: AIProviderCredential,
      ) => Promise<{ success: boolean }>;
      deleteCredential: (id: string) => Promise<{ success: boolean }>;
    };
    mcpApi: {
      createMcp: (
        mcpData: McpSubmitData,
      ) => Promise<{ success: boolean; mcpId?: string; message?: string }>;
      listMcps: () => Promise<{
        success: boolean;
        mcps?: McpData[];
        message?: string;
      }>;
      getMcp: (
        id: string,
      ) => Promise<{ success: boolean; mcp?: McpData; message?: string }>;
      updateMcp: (
        id: string,
        data: McpSubmitData,
      ) => Promise<{ success: boolean; message?: string }>;
      deleteMcp: (
        id: string,
      ) => Promise<{ success: boolean; message?: string }>;

      // MCP server operations
      getMcpServerStatus: (mcpId: string) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      getAllMcpServerStatuses: () => Promise<{
        success: boolean;
        data?: Record<string, McpServerState>;
        message?: string;
      }>;
      startMcpServer: (mcpId: string) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      stopMcpServer: (mcpId: string) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      restartMcpServer: (mcpId: string) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      getMcpTools: (
        mcpId: string,
      ) => Promise<{ success: boolean; data?: Tool[]; message?: string }>;
      callMcpTool: (
        mcpId: string,
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ success: boolean; data?: unknown; message?: string }>;
      openUserDataMcpJsonFile: () => Promise<{
        success: boolean;
        message?: string;
      }>;
      downloadMcpZip: (mcpId: string) => Promise<{
        success: boolean;
        data?: { success: boolean; filePath?: string; message?: string };
        message?: string;
      }>;
      showFileInFolder: (
        path: string,
      ) => Promise<{ success: boolean; message?: string }>;
    };
    externalMcpApi: {
      connectExternalMcpServer: (
        mcpId: string,
        force?: boolean,
      ) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      stopExternalMcpServer: (mcpId: string) => Promise<{
        success: boolean;
        data?: McpServerState;
        message?: string;
      }>;
      onExternalMcpServersUpdated: (
        callback: (mcpServers: Record<string, McpServerState>) => void,
      ) => () => void;
    };
    datasets: {
      // Dataset-level operations
      addDataset: (data: {
        name: string;
        description?: string;
        tags?: string[];
        initialItem?: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">;
      }) => Promise<{ success: boolean; id?: string; message?: string }>;
      updateDataset: (
        id: string,
        updates: Partial<
          Omit<Dataset, "id" | "items" | "createdAt" | "updatedAt">
        >,
      ) => Promise<{ success: boolean; message?: string }>;
      deleteDataset: (
        id: string,
      ) => Promise<{ success: boolean; message?: string }>;
      getDataset: (id: string) => Promise<{
        success: boolean;
        dataset?: Dataset;
        message?: string;
      }>;
      listDatasets: () => Promise<{
        success: boolean;
        datasets?: Dataset[];
        message?: string;
      }>;
      searchDatasets: (query: string) => Promise<{
        success: boolean;
        datasets?: Dataset[];
        message?: string;
      }>;
      // Item-level operations
      addItem: (
        datasetId: string,
        item: Omit<DatasetItem, "id" | "createdAt" | "updatedAt">,
      ) => Promise<{ success: boolean; id?: string; message?: string }>;
      updateItem: (
        datasetId: string,
        itemId: string,
        updates: Partial<Omit<DatasetItem, "id" | "createdAt" | "updatedAt">>,
      ) => Promise<{ success: boolean; message?: string }>;
      deleteItem: (
        datasetId: string,
        itemId: string,
      ) => Promise<{ success: boolean; message?: string }>;
      // Utility operations
      datasetExists: (
        id: string,
      ) => Promise<{ success: boolean; exists?: boolean; message?: string }>;
      getDatasetCount: () => Promise<{
        success: boolean;
        count?: number;
        message?: string;
      }>;
    };
    workspaces: {
      listWorkspaces: () => Promise<
        {
          id: string;
          name: string;
          isDefault: boolean;
          createdAt: string;
          updatedAt: string;
        }[]
      >;
      getCurrentWorkspace: () => Promise<{
        id: string;
        name: string;
        isDefault: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
      setCurrentWorkspace: (workspaceId: string) => Promise<boolean>;
      createWorkspace: (name: string) => Promise<{
        id: string;
        name: string;
        isDefault: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
      updateWorkspace: (
        id: string,
        updates: Partial<{ name: string }>,
      ) => Promise<boolean>;
      deleteWorkspace: (id: string) => Promise<boolean>;
    };
    agentTools: {
      listApis: () => Promise<ToolResult>;
      searchApiEndpoints: (args: {
        apiId: string;
        query?: string;
        tags?: string[];
      }) => Promise<ToolResult>;
      optimiseToolDef: (args: {
        apiId: string;
        mcpId: string;
        toolName: string;
        goal: string;
      }) => Promise<ToolResult>;
    };
  }
}

const root = createRoot(document.getElementById("app")!);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
