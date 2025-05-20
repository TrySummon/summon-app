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
import { McpToolDefinition } from "./helpers/openapi/types";
import { AuthCredentials } from "./types/auth";
import { OpenAPIV3 } from "openapi-types";
import { ThemeMode } from "./types/theme-mode";

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
      getCredentials: (apiId: string) => Promise<AuthCredentials | null>;
      saveCredentials: (apiId: string, credentials: AuthCredentials) => Promise<boolean>;
      clearCredentials: (apiId: string) => Promise<boolean>;
      testCredentials: (baseUrl: string, authType: string, authData: any) => Promise<{ status: number, success: boolean, message?: string }>;
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
