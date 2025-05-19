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
import { API, McpToolDefinition } from "./helpers/openapi/types";
import { AuthCredentials } from "./types/auth";

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
    openapi: {
      db: {
        listApis: () => Promise<{ 
          success: boolean; 
          apis?: { id: string; api: API; createdAt: string; updatedAt: string }[];
          message?: string;
        }>;
        getApi: (id: string) => Promise<{
          success: boolean;
          api?: { id: string; api: API; tools: McpToolDefinition[]; createdAt: string; updatedAt: string };
          message?: string;
        }>;
        updateApi: (id: string, api: API) => Promise<{
          success: boolean;
          message: string;
        }>;
        deleteApi: (id: string) => Promise<{
          success: boolean;
          message: string;
        }>;
        listApiTools: (apiId: string) => Promise<{
          success: boolean;
          tools?: McpToolDefinition[];
          message?: string;
        }>;
        getApiTool: (apiId: string, toolName: string) => Promise<{
          success: boolean;
          tool?: McpToolDefinition;
          message?: string;
        }>;
        updateApiTool: (apiId: string, toolName: string, tool: McpToolDefinition) => Promise<{
          success: boolean;
          message: string;
        }>;
        deleteApiTool: (apiId: string, toolName: string) => Promise<{
          success: boolean;
          message: string;
        }>;
      };
      import: (file: File, options: any) => Promise<any>;
    }
    auth: {
      getCredentials: (apiId: string) => Promise<AuthCredentials | null>;
      saveCredentials: (apiId: string, credentials: AuthCredentials) => Promise<boolean>;
      clearCredentials: (apiId: string) => Promise<boolean>;
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
