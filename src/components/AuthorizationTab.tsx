import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LockKeyhole, Key, ShieldCheck, XCircle } from "lucide-react";

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


// Define the form schema with conditional fields based on auth type
const formSchema = z.object({
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

  // Initialize the form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
  
  // Load saved credentials on mount
  useEffect(() => {
    if (credentials) {
      // Set form values based on saved credentials
      form.reset({
        type: credentials.type,
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
        type: "noAuth",
        basicAuth: { username: "", password: "" },
        bearerToken: { token: "" },
        apiKey: { key: "", in: "header", name: "X-API-Key" }
      });
      
      // Also reset our local state for UI rendering
      setCurrentAuthType("noAuth");
    }
  };

  return (
    <div className="flex flex-col space-y-6 px-4 py-2 max-w-2xl mx-auto">
      <Alert className="bg-muted/50">
        <AlertDescription className="text-sm text-muted-foreground">
          This authorization method will be used for all requests to this API.
        </AlertDescription>
      </Alert>

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
