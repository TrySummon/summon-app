import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LockKeyhole, Key, ShieldCheck, XCircle, CheckCircle2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecureCredentials } from "@/hooks/useSecureCredentials";
import { AuthCredentials } from "@/types/auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useApis } from "@/hooks/useApis";
import { joinUrl } from "@/helpers/openapi/utils/url";


// Define the form schema with conditional fields based on auth type
const formSchema = z.object({
  baseUrl: z.string().optional(),
  type: z.enum(["noAuth", "basicAuth", "bearerToken", "apiKey"]),
  basicAuth: z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required")
  }).optional(),
  bearerToken: z.object({
    token: z.string().min(1, "Token is required")
  }).optional(),
  apiKey: z.object({
    key: z.string().min(1, "API key is required"),
    in: z.enum(["header", "query"]),
    name: z.string().min(1, "Key name is required")
  }).optional()
});

type FormValues = z.infer<typeof formSchema>;

interface AuthorizationTabProps {
  apiId: string;
}

export function AuthorizationTab({ apiId }: AuthorizationTabProps) {
  const { credentials, saveCredentials, clearCredentials, loading } = useSecureCredentials(apiId);
  const { apis } = useApis();
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ status: 'idle' });

  // Initialize the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: "",
      type: "noAuth",
      basicAuth: { username: "", password: "" },
      bearerToken: { token: "" },
      apiKey: { key: "", in: "header", name: "X-API-Key" }
    },
    mode: "onChange"
  });

  // Use a local state to track the auth type for UI rendering
  const [currentAuthType, setCurrentAuthType] = useState<string>(form.getValues("type") || "noAuth");
  
  // Watch the authentication type to conditionally render form sections
  // This is still needed for form validation
  const authType = form.watch("type");
  
  // Watch the baseUrl to use in the test credentials function
  const baseUrl = form.watch("baseUrl");
  
  // Get available server URLs from the API definition
  const [serverUrls, setServerUrls] = useState<Array<{ url: string, description?: string }>>([]);

  useEffect(() => {
    // Find the current API in the list of APIs
    const currentApi = apis.find(api => api.id === apiId);
    if (currentApi?.api?.servers && currentApi.api.servers.length > 0) {
      setServerUrls(currentApi.api.servers);
      
      // Set the first server URL as the default if available
      if (currentApi.api.servers[0]?.url) {
        form.setValue('baseUrl', currentApi.api.servers[0].url);
      }
    } else {
      // If no servers are defined, add a default localhost option
      setServerUrls([{ url: 'http://localhost:8080', description: 'Default Local Server' }]);
      form.setValue('baseUrl', 'http://localhost:8080');
    }
  }, [apis, apiId, form]);

  // Load saved credentials on mount
  useEffect(() => {
    if (credentials) {
      // Set form values based on saved credentials
      form.reset({
        ...form.getValues(),
        type: credentials.type,
        // Use the saved baseUrl if available, otherwise keep the current value
        baseUrl: credentials.baseUrl || form.getValues().baseUrl,
        basicAuth: credentials.basicAuth || { username: "", password: "" },
        bearerToken: credentials.bearerToken || { token: "" },
        apiKey: credentials.apiKey || { key: "", in: "header", name: "X-API-Key" }
      });
      
      // Also update our local state for UI rendering
      setCurrentAuthType(credentials.type);
    }
  }, [credentials, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Create credentials object from form values
      const newCredentials: AuthCredentials = {
        apiId,
        type: values.type,
        baseUrl: values.baseUrl, // Save the selected base URL with the credentials
      };

      if (values.type === "basicAuth" && values.basicAuth) {
        newCredentials.basicAuth = values.basicAuth;
      } else if (values.type === "bearerToken" && values.bearerToken) {
        newCredentials.bearerToken = values.bearerToken;
      } else if (values.type === "apiKey" && values.apiKey) {
        newCredentials.apiKey = values.apiKey;
      }

      await saveCredentials(newCredentials);
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const handleClearCredentials = async () => {
    const success = await clearCredentials();
    
    if (success) {
      // Reset form to default values
      form.reset({
        ...form.getValues(),
        type: "noAuth",
        basicAuth: { username: "", password: "" },
        bearerToken: { token: "" },
        apiKey: { key: "", in: "header", name: "X-API-Key" }
      });
      
      // Also reset our local state for UI rendering
      setCurrentAuthType("noAuth");
      // Reset test status
      setTestStatus({ status: 'idle' });
    }
  };

  // Function to test the credentials against a base URL
  const testCredentials = async () => {
    try {
      setTestStatus({ status: 'loading' });
      
      // Use the watched baseUrl value to ensure we have the latest value
      if (!baseUrl) {
        setTestStatus({ 
          status: 'error', 
          message: 'Please select a base URL to test against' 
        });
        return;
      }
      
      const values = form.getValues();

      // Get the auth data based on the auth type
      let authData = null;
      if (values.type === 'basicAuth') {
        authData = values.basicAuth;
      } else if (values.type === 'bearerToken') {
        authData = values.bearerToken;
      } else if (values.type === 'apiKey') {
        authData = values.apiKey;
      }
      
      // Use the IPC API to test credentials - this avoids CORS issues
      const result = await window.auth.testCredentials(baseUrl, values.type, authData);
      
      if (result.success) {
        setTestStatus({ 
          status: 'success', 
          message: `Authentication successful (${result.message})` 
        });
      } else {
        setTestStatus({ 
          status: 'error', 
          message: `Authentication failed (${result.message})` 
        });
      }
    } catch (error) {
      console.error('Error testing credentials:', error);
      setTestStatus({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  };

  return (
    <div className="flex flex-col space-y-6 px-4 py-2 max-w-2xl mx-auto">
      <Alert className="bg-muted/50">
        <AlertDescription className="text-sm text-muted-foreground">
          This authorization method will be used for all requests to this API.
        </AlertDescription>
      </Alert>

      {/* Test Status Alert */}
      {testStatus.status !== 'idle' && (
        <Alert className={`${testStatus.status === 'success' ? 'bg-green-50 border-green-200' : 
                            testStatus.status === 'error' ? 'bg-red-50 border-red-200' : 
                            'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center">
            {testStatus.status === 'loading' && (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            )}
            {testStatus.status === 'success' && (
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
            )}
            {testStatus.status === 'error' && (
              <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
            )}
            <AlertDescription className="text-sm">
              {testStatus.message || (testStatus.status === 'loading' ? 'Testing credentials...' : '')}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Form {...form}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form.getValues());
          }} 
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base URL</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a server URL" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {serverUrls.map((server, index) => (
                      <SelectItem key={index} value={server.url}>
                        <div className="flex flex-col">
                          <span>{server.url}</span>
                          {server.description && (
                            <span className="text-xs text-muted-foreground">{server.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    // Update both the form field and our local state
                    field.onChange(value);
                    setCurrentAuthType(value);
                    
                    // When switching auth types, preserve the current form values
                    // but update the type - need to cast value to the correct type
                    const authTypeValue = value as "noAuth" | "basicAuth" | "bearerToken" | "apiKey";
                    const currentValues = form.getValues();
                    form.reset({
                      ...currentValues,
                      type: authTypeValue
                    }, { keepDefaultValues: true });
                  }}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="noAuth" className="flex items-center">
                      <div className="flex items-center">
                        <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>No Authentication</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="basicAuth">
                      <div className="flex items-center">
                        <LockKeyhole className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>Basic Authentication</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="bearerToken">
                      <div className="flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>Bearer Token</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="apiKey">
                      <div className="flex items-center">
                        <Key className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>API Key</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {currentAuthType === "basicAuth" && (
            <div className="space-y-4 rounded-md border p-4">
              <FormField
                control={form.control}
                name="basicAuth.username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="basicAuth.password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentAuthType === "bearerToken" && (
            <div className="space-y-4 rounded-md border p-4">
              <FormField
                control={form.control}
                name="bearerToken.token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter token" {...field} />
                    </FormControl>
                    <FormDescription>
                      The token will be sent as a Bearer token in the Authorization header.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentAuthType === "apiKey" && (
            <div className="space-y-4 rounded-md border p-4">
              <FormField
                control={form.control}
                name="apiKey.key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter API key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiKey.name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Name</FormLabel>
                    <FormControl>
                      <Input placeholder="X-API-Key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiKey.in"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Add to</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="header" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Header
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="query" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Query Parameter
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearCredentials}
              disabled={loading || currentAuthType === "noAuth"}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={testCredentials}
              disabled={loading || currentAuthType === "noAuth" || testStatus.status === 'loading'}
              className="mr-auto"
            >
              {testStatus.status === 'loading' ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Testing...
                </>
              ) : 'Test Credentials'}
            </Button>
            <Button
              type="submit"
              disabled={loading || currentAuthType === "noAuth"}
            >
              Save
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
