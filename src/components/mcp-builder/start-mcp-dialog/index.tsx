import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { McpData, McpEndpoint } from "@/helpers/db/mcp-db";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ServerNameField } from "./ServerNameField";
import { ApiGroupSection } from "./ApiGroupSection";
import { toast } from "sonner";
import { useMcps } from "@/hooks/useMcps";

// Define the auth types as discriminated unions
const noAuthSchema = z.object({
  type: z.literal("noAuth")
});

const bearerTokenSchema = z.object({
  type: z.literal("bearerToken"),
  token: z.string().optional()
});

const apiKeySchema = z.object({
  type: z.literal("apiKey"),
  key: z.string().optional(),
  in: z.enum(["header", "query"]).optional(),
  name: z.string().optional()
});

// Combine them into a discriminated union
const authSchema = z.discriminatedUnion("type", [
  noAuthSchema,
  bearerTokenSchema,
  apiKeySchema
]);

// Define the form schema for the MCP server configuration
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  apiAuth: z.record(
    z.object({
      serverUrl: z.string().optional(),
      useMockData: z.boolean().default(true),
      auth: authSchema
    }).superRefine((data, ctx) => {
      // If useMockData is false, serverUrl is required
      if (!data.useMockData && (!data.serverUrl || data.serverUrl.trim() === "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Server URL is required",
          path: ["serverUrl"]
        });
      }
    })
  )
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

export interface ApiGroup {
  apiId: string;
  apiName: string;
  endpoints: McpEndpoint[];
}

interface StartMcpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiGroups: Record<string, ApiGroup>;
  onServerStart?: (mcpId: string) => void;
  isEditMode?: boolean;
  editMcpData?: any;
  editMcpId?: string | null;
}


export function StartMcpDialog({ 
  open, 
  onOpenChange, 
  apiGroups,
  onServerStart,
  isEditMode = false,
  editMcpData,
  editMcpId,
}: StartMcpDialogProps) {
  const { createMcp, updateMcp: updateMcpMutation } = useMcps();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with initial values based on edit mode
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: isEditMode && editMcpData ? editMcpData.name : "",
      apiAuth: {}
    },
    mode: "onChange", // Enable validation on change for better UX feedback
  });

  // Update form values when apiGroups changes or in edit mode
  useEffect(() => {
    if (Object.keys(apiGroups).length > 0) {
      // Get current form values
      const currentValues = form.getValues();
      const currentApiAuth = currentValues.apiAuth || {};
      
      // Create updated apiAuth object with new apiGroups
      const updatedApiAuth = Object.keys(apiGroups).reduce((acc, apiId) => {
        if (isEditMode && editMcpData && editMcpData.apiGroups && editMcpData.apiGroups[apiId]) {
          // In edit mode, use values from the existing MCP data
          acc[apiId] = {
            serverUrl: editMcpData.apiGroups[apiId].serverUrl || "",
            useMockData: editMcpData.apiGroups[apiId].useMockData !== undefined ? 
              editMcpData.apiGroups[apiId].useMockData : true,
            auth: editMcpData.apiGroups[apiId].auth || { type: "noAuth" }
          };
        } else {
          // Preserve existing values if they exist, or use defaults
          acc[apiId] = currentApiAuth[apiId] || {
            serverUrl: "",
            useMockData: true,
            auth: { type: "noAuth" }
          };
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Update form values
      form.setValue("apiAuth", updatedApiAuth);
    }
  }, [apiGroups, form, isEditMode, editMcpData]);

  // Handle form submission
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      
      // Create MCP configuration in the database
      // First, create a copy of the form data
      const mcpData: Omit<McpData, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        apiGroups: {}
      };
      
      // Add endpoints to each API group
      Object.entries(data.apiAuth).forEach(([apiId, apiConfig]) => {
        mcpData.apiGroups[apiId] = {
          ...apiConfig,
          name: apiGroups[apiId]?.apiName,
          // Include the endpoints for this API
          endpoints: apiGroups[apiId]?.endpoints || []
        };
      });
      
      // Extract credentials from the form data
      const credentials: Record<string, any> = {};
      
      // Process each API group to extract credentials
      Object.entries(data.apiAuth).forEach(([apiId, apiConfig]) => {
        if (apiConfig.auth.type !== 'noAuth') {
          // Store credentials based on auth type
          credentials[apiId] = { type: apiConfig.auth.type };
          
          if (apiConfig.auth.type === 'bearerToken') {
            credentials[apiId].token = apiConfig.auth.token;
          } else if (apiConfig.auth.type === 'apiKey') {
            credentials[apiId].key = apiConfig.auth.key;
            credentials[apiId].in = apiConfig.auth.in;
            credentials[apiId].name = apiConfig.auth.name;
          }
        }
      });
      
      let mcpId: string | undefined;
      
      // Use the mutations from useMcps
      if (isEditMode && editMcpId) {
        // Update existing MCP
        await updateMcpMutation(
          { 
            mcpId: editMcpId, 
            mcpData, 
            credentials: Object.keys(credentials).length > 0 ? credentials : undefined 
          },
          {
            onSuccess: (result: { success: boolean; message?: string }) => {
              mcpId = editMcpId;
              toast.success(`MCP server '${data.name}' updated successfully.`);
              
              // Call the onServerStart callback if provided
              if (onServerStart) {
                onServerStart(mcpId);
              }
              
              // Close the dialog
              onOpenChange(false);
            },
            onError: (error: unknown) => {
              toast.error(`Failed to update MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        );
      } else {
        // Create new MCP
        await createMcp(
          { 
            mcpData, 
            credentials: Object.keys(credentials).length > 0 ? credentials : undefined 
          },
          {
            onSuccess: (result: { success: boolean; mcpId?: string; message?: string }) => {
              if (result.mcpId) {
                mcpId = result.mcpId;
                toast.success(`MCP server '${data.name}' created successfully.`);
                
                // Call the onServerStart callback if provided
                if (onServerStart) {
                  onServerStart(mcpId);
                }
                
                // Close the dialog
                onOpenChange(false);
              } else {
                toast.error('Failed to create MCP server: No MCP ID returned');
              }
            },
            onError: (error: unknown) => {
              toast.error(`Failed to create MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error saving MCP configuration:", error);
      toast.error("An unexpected error occurred while saving the MCP configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-5/6 p-0 gap-0 overflow-hidden sm:max-w-none flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <DialogHeader>
            <DialogTitle>Start MCP Server</DialogTitle>
            <DialogDescription>
              Almost there! Tell us which authentication method you want to use for each API.
            </DialogDescription>
          </DialogHeader>
        </div>
 
        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit as any)}>
              <ServerNameField form={form} />
              
              <Separator className="my-4" />
              
              <div className="space-y-6">              
                {Object.values(apiGroups).map((api, index) => (
                  <ApiGroupSection 
                    key={api.apiId}
                    api={api}
                    form={form}
                    isLast={index === Object.values(apiGroups).length - 1}
                  />
                ))}
              </div>
            </form>
          </Form>
        </div>
        
        <DialogFooter className="flex items-center justify-end gap-2 p-6 border-t">
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit as any)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Start Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
