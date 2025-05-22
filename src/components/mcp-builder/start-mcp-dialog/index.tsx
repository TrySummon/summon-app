import React, { useMemo, useEffect } from "react";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ServerNameField } from "./ServerNameField";
import { ApiGroupSection } from "./ApiGroupSection";

// Define the auth types as discriminated unions
const noAuthSchema = z.object({
  type: z.literal("noAuth")
});

const basicAuthSchema = z.object({
  type: z.literal("basicAuth"),
  username: z.string().optional(),
  password: z.string().optional()
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
  basicAuthSchema,
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
  endpoints: Array<{
    apiId: string;
    apiName: string;
    method: string;
    path: string;
    operation: any;
  }>;
}

interface StartMcpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiGroups: Record<string, ApiGroup>;
  onStart: (name: string, authConfig: any) => void;
}


export function StartMcpDialog({ 
  open, 
  onOpenChange, 
  apiGroups,
  onStart
}: StartMcpDialogProps) {

  // Form setup with initial empty values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      apiAuth: {}
    },
    mode: "onChange", // Enable validation on change for better UX feedback
  });

  // Update form values when apiGroups changes
  useEffect(() => {
    if (Object.keys(apiGroups).length > 0) {
      // Get current form values
      const currentValues = form.getValues();
      const currentApiAuth = currentValues.apiAuth || {};
      
      // Create updated apiAuth object with new apiGroups
      const updatedApiAuth = Object.keys(apiGroups).reduce((acc, apiId) => {
        // Preserve existing values if they exist
        acc[apiId] = currentApiAuth[apiId] || {
          serverUrl: "",
          useMockData: true,
          auth: { type: "noAuth" }
        };
        return acc;
      }, {} as Record<string, any>);
      
      // Update form values
      form.setValue("apiAuth", updatedApiAuth);
    }
  }, [apiGroups, form]);

  // Handle form submission
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    onStart(data.name, data);
    onOpenChange(false);
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
            <Button variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button type="submit" onClick={form.handleSubmit(onSubmit as any)}>
            Start Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
