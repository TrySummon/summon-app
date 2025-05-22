import React, { useEffect } from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { OpenAPIV3 } from "openapi-types";

// Type for security scheme that handles both direct SecuritySchemeObject and ReferenceObject
export type SecuritySchemeType = OpenAPIV3.SecuritySchemeObject | OpenAPIV3.ReferenceObject;

// Type guards
export function isReferenceObject(obj: any): obj is OpenAPIV3.ReferenceObject {
  return obj && '$ref' in obj;
}

export function isHttpSecurityScheme(obj: any): obj is OpenAPIV3.HttpSecurityScheme {
  return obj && obj.type === 'http' && 'scheme' in obj;
}

export function isApiKeySecurityScheme(obj: any): obj is OpenAPIV3.ApiKeySecurityScheme {
  return obj && obj.type === 'apiKey' && 'name' in obj && 'in' in obj;
}

// Helper function to determine auth type from OpenAPI security schemes
export function getAuthTypeFromSecuritySchemes(securitySchemes: Record<string, SecuritySchemeType> | undefined): {
  authType: "noAuth" | "bearerToken" | "apiKey";
  apiKeyDetails?: { name: string; in: "header" | "query" };
} {
  if (!securitySchemes || Object.keys(securitySchemes).length === 0) {
    return { authType: "noAuth" };
  }

  // Check for common security scheme types
  for (const [key, schemeOrRef] of Object.entries(securitySchemes)) {
    // Skip reference objects
    if (isReferenceObject(schemeOrRef)) {
      continue;
    }
    
    // Handle HTTP security schemes (Basic Auth, Bearer Token)
    if (isHttpSecurityScheme(schemeOrRef)) {
      if (schemeOrRef.scheme === "bearer") {
        return { authType: "bearerToken" };
      }
    } 
    // Handle API Key security schemes
    else if (isApiKeySecurityScheme(schemeOrRef)) {
      return { 
        authType: "apiKey",
        apiKeyDetails: {
          name: schemeOrRef.name,
          in: schemeOrRef.in as "header" | "query"
        }
      };
    }
  }

  return { authType: "noAuth" };
}

// Get allowed auth methods from security schemes
export function getAllowedAuthMethods(schemes: Record<string, SecuritySchemeType> | undefined) {
  if (!schemes) return [];
  
  const allowedMethods = [];
  
  const hasBearerToken = Object.values(schemes).some(s => 
    !isReferenceObject(s) && isHttpSecurityScheme(s) && s.scheme === "bearer"
  );
  if (hasBearerToken) allowedMethods.push("bearerToken");
  
  const hasApiKey = Object.values(schemes).some(s => 
    !isReferenceObject(s) && isApiKeySecurityScheme(s)
  );
  if (hasApiKey) allowedMethods.push("apiKey");
  
  return allowedMethods;
}

interface MockDataToggleProps {
  form: UseFormReturn<any>;
  apiId: string;
  updateAuthType: (apiId: string, useMockData: boolean) => void;
}

export function MockDataToggle({ form, apiId, updateAuthType }: MockDataToggleProps) {
  return (
    <FormField
      control={form.control}
      name={`apiAuth.${apiId}.useMockData`}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <FormLabel className="text-xs font-medium">Mock Server</FormLabel>
            <FormDescription className="text-xs">
              No real API calls will be made
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                updateAuthType(apiId, checked);
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

interface BearerTokenFormProps {
  form: UseFormReturn<any>;
  apiId: string;
}

export function BearerTokenForm({ form, apiId }: BearerTokenFormProps) {
  return (
    <FormField
      control={form.control}
      name={`apiAuth.${apiId}.auth.token`}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs">Token</FormLabel>
          <FormControl>
            <Input placeholder="Enter token" {...field} className="h-8" />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

interface ApiKeyFormProps {
  form: UseFormReturn<any>;
  apiId: string;
}

export function ApiKeyForm({ form, apiId }: ApiKeyFormProps) {
  return (
    <div className="space-y-3">
      <FormField
        control={form.control}
        name={`apiAuth.${apiId}.auth.key`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-xs">API Key</FormLabel>
            <FormControl>
              <Input placeholder="Enter API key" {...field} className="h-8" />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}

interface NoAuthWarningProps {
  message?: string;
}

export function NoAuthWarning({ message = "No authentication required for this API" }: NoAuthWarningProps) {
  return (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}

interface AuthFormProps {
  form: UseFormReturn<any>;
  apiId: string;
  schemes: Record<string, SecuritySchemeType> | undefined;
}

export function AuthForm({ form, apiId, schemes }: AuthFormProps) {
  const allowedAuthMethods = getAllowedAuthMethods(schemes);
  const hasMultipleSchemes = allowedAuthMethods.length > 1;
  
  // Ensure we have a valid auth type selected
  const currentAuth = form.watch(`apiAuth.${apiId}.auth`);
  const currentAuthType = currentAuth?.type;
  
  // If the current auth type isn't in the allowed methods, select the first allowed method
  useEffect(() => {
    if (allowedAuthMethods.length > 0 && !allowedAuthMethods.includes(currentAuthType)) {
      form.setValue(`apiAuth.${apiId}.auth`, { type: allowedAuthMethods[0] });
    }
  }, [allowedAuthMethods, apiId, currentAuthType, form]);
  
  return (
    <FormField
      control={form.control}
      name={`apiAuth.${apiId}.auth.type`}
      render={({ field: authTypeField }) => (
        <FormItem>
          {hasMultipleSchemes ? (
            <Tabs 
              value={authTypeField.value} 
              defaultValue={allowedAuthMethods[0] || "noAuth"}
              onValueChange={authTypeField.onChange}
              className="w-full"
            >
              <TabsList className="grid w-fit h-8 grid-flow-col gap-1">
                {allowedAuthMethods.includes("bearerToken") && (
                  <TabsTrigger value="bearerToken" className="p-1 text-xs">
                    Bearer Token
                  </TabsTrigger>
                )}
                {allowedAuthMethods.includes("apiKey") && (
                  <TabsTrigger value="apiKey" className="p-1 text-xs">
                    API Key
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="bearerToken">
                <BearerTokenForm form={form} apiId={apiId} />
              </TabsContent>
              
              <TabsContent value="apiKey">
                <ApiKeyForm form={form} apiId={apiId} />
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              {authTypeField.value === "bearerToken" && <BearerTokenForm form={form} apiId={apiId} />}
              {authTypeField.value === "apiKey" && <ApiKeyForm form={form} apiId={apiId} />}
              {authTypeField.value === "noAuth" && <NoAuthWarning />}
              {!allowedAuthMethods.length && <NoAuthWarning message="No authentication methods available for this API" />}
            </div>
          )}
        </FormItem>
      )}
    />
  );
}
