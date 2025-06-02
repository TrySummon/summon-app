import React, { useEffect } from "react";
import { FormLabel } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { MockDataToggle, AuthForm } from "./AuthComponents";
import { getAuthTypeFromSecuritySchemes } from "./AuthComponents";
import { ServerUrlField } from "./ServerUrlField";
import { TestConnectionButton } from "./TestConnectionButton";
import { useApi } from "@/hooks/useApis";
import { McpEndpoint } from "@/helpers/db/mcp-db";

interface ApiGroupProps {
  api: {
    apiId: string;
    apiName: string;
    endpoints: McpEndpoint[];
  };
  form: UseFormReturn<any>;
  isLast: boolean;
}

export function ApiGroupSection({ 
  api, 
  form, 
  isLast 
}: ApiGroupProps) {
  const { api: apiDetails } = useApi(api.apiId);
  
  const serverUrls = apiDetails?.api?.servers || [];
  const securitySchemes = apiDetails?.api?.components?.securitySchemes
  
  // Initialize the server URL field when component mounts
  useEffect(() => {
    // Set default server URL if available
    if (serverUrls.length > 0 && !form.getValues(`apiAuth.${api.apiId}.serverUrl`)) {
      form.setValue(`apiAuth.${api.apiId}.serverUrl`, serverUrls[0].url);
    }
  }, [api.apiId, form, serverUrls]);
  
  // Update auth type when useMockData changes
  const updateAuthType = (apiId: string, useMockData: boolean) => {
    if (useMockData) {
      // Reset auth fields when switching to mock data
      form.setValue(`apiAuth.${apiId}.auth`, { type: "noAuth" });
    } else {
      // Set auth type based on security schemes
      const { authType, apiKeyDetails } = getAuthTypeFromSecuritySchemes(securitySchemes);
      
      // Initialize fields based on auth type
      if (authType === "bearerToken") {
        form.setValue(`apiAuth.${apiId}.auth`, { 
          type: "bearerToken", 
          token: "" 
        });
      } else if (authType === "apiKey" && apiKeyDetails) {
        form.setValue(`apiAuth.${apiId}.auth`, { 
          type: "apiKey",
          key: "", 
          in: apiKeyDetails.in, 
          name: apiKeyDetails.name 
        });
      } else {
        // Default to noAuth, but user can optionally configure authentication
        form.setValue(`apiAuth.${apiId}.auth`, { type: "noAuth" });
      }
    }
  };

  // Helper function to initialize API key auth with defaults when user selects it
  const initializeApiKeyAuth = () => {
    const { apiKeyDetails } = getAuthTypeFromSecuritySchemes(securitySchemes);
    form.setValue(`apiAuth.${api.apiId}.auth`, { 
      type: "apiKey",
      key: "", 
      in: apiKeyDetails?.in || "header", 
      name: apiKeyDetails?.name || "X-API-Key" 
    });
  };

  // Helper function to initialize bearer token auth
  const initializeBearerTokenAuth = () => {
    form.setValue(`apiAuth.${api.apiId}.auth`, { 
      type: "bearerToken", 
      token: "" 
    });
  };

  return (
    <div className="space-y-4">
      <FormLabel className="text-sm font-medium">{api.apiName} Authorization</FormLabel>
      
      <MockDataToggle 
        form={form}
        apiId={api.apiId} 
        updateAuthType={updateAuthType} 
      />
      
      <FormField
        control={form.control}
        name={`apiAuth.${api.apiId}.useMockData`}
        render={({ field }) => (
          <div>
            {!field.value && (
              <div className="space-y-4">
                <ServerUrlField 
                  form={form}
                  apiId={api.apiId}
                  serverUrls={serverUrls}
                />
                
                <AuthForm 
                  form={form} 
                  apiId={api.apiId} 
                  schemes={securitySchemes} 
                  initializeApiKeyAuth={initializeApiKeyAuth}
                  initializeBearerTokenAuth={initializeBearerTokenAuth}
                />
                
                <TestConnectionButton 
                  form={form}
                  apiId={api.apiId}
                />
              </div>
            )}
          </div>
        )}
      />
      
      {!isLast && <Separator className="mt-4" />}
    </div>
  );
}