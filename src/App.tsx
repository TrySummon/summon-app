import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { useTranslation } from "react-i18next";
import "./localization/i18n";
import { updateAppLanguage } from "./helpers/language_helpers";
import { router } from "./routes/router";
import { RouterProvider } from "@tanstack/react-router";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { McpToolDefinition } from "./helpers/mcp/types";
import { OpenAPIV3 } from "openapi-types";
import { ThemeMode } from "./types/theme-mode";
import { McpTransport } from "./helpers/ipc/mcp";
import { McpData } from "./helpers/db/mcp-db";
import { McpServerState } from "./helpers/mcp";
import { Tool } from "@modelcontextprotocol/sdk/types";

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    syncThemeWithLocal();
    updateAppLanguage(i18n);
  }, [i18n]);

  return <RouterProvider router={router} />;
}

const queryClient = new QueryClient()


// Define the interface for the electron API
declare global {
  interface Window {
    require: (module: string) => any;
    themeMode: {
      current: () => Promise<ThemeMode>;
      dark: () => Promise<void>;
      light: () => Promise<void>;
    };
    openapi: {
      db: {
        listApis: () => Promise<{ 
          success: boolean; 
          apis?: { id: string; api: OpenAPIV3.Document; createdAt: string; updatedAt: string }[];
          message?: string;
        }>;
        getApi: (id: string) => Promise<{
          success: boolean;
          api?: { id: string; api: OpenAPIV3.Document; tools: McpToolDefinition[]; createdAt: string; updatedAt: string };
          message?: string;
        }>;
        updateApi: (id: string, api: OpenAPIV3.Document) => Promise<{
          success: boolean;
          message: string;
        }>;
        deleteApi: (id: string) => Promise<{
          success: boolean;
          message: string;
        }>;
      };
      import: (file: File) => Promise<any>;
    }
    auth: {
      testCredentials: (baseUrl: string, authType: string, authData: any) => Promise<{ status: number, success: boolean, message?: string }>;
    },
    mcpApi: {
      createMcp: (mcpData: any) => Promise<{ success: boolean; mcpId?: string; message?: string }>;
      listMcps: () => Promise<{ success: boolean; mcps?: McpData[]; message?: string }>;
      getMcp: (id: string) => Promise<{ success: boolean; mcp?: McpData; message?: string }>;
      updateMcp: (id: string, data: any) => Promise<{ success: boolean; message?: string }>;
      deleteMcp: (id: string) => Promise<{ success: boolean; message?: string }>;

      // MCP server operations
      getMcpServerStatus: (mcpId: string) => Promise<{ success: boolean; data?: McpServerState; message?: string }>;
      getAllMcpServerStatuses: () => Promise<{ success: boolean; data?: Record<string, McpServerState>; message?: string }>;
      startMcpServer: (mcpId: string) => Promise<{ success: boolean; data?: McpServerState; message?: string }>;
      stopMcpServer: (mcpId: string) => Promise<{ success: boolean; data?: McpServerState; message?: string }>;
      restartMcpServer: (mcpId: string) => Promise<{ success: boolean; data?: McpServerState; message?: string }>;
      getMcpTools: (config: McpTransport) => Promise<{ success: boolean; data?: Tool[]; message?: string }>;
    }
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
