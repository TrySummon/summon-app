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
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { McpData, McpEndpoint } from "@/helpers/db/mcp-db";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ServerNameField } from "./ServerNameField";
import { ApiGroupSection } from "./ApiGroupSection";
import { toast } from "sonner";
import { useMcps } from "@/hooks/useMcps";
import { useNavigate } from "@tanstack/react-router";

// Define the auth types as discriminated unions
const noAuthSchema = z.object({
  type: z.literal("noAuth"),
});

const bearerTokenSchema = z.object({
  type: z.literal("bearerToken"),
  token: z.string().optional(),
});

const apiKeySchema = z.object({
  type: z.literal("apiKey"),
  key: z.string().optional(),
  in: z.enum(["header", "query"]).optional(),
  name: z.string().optional(),
});

// Combine them into a discriminated union
const authSchema = z.discriminatedUnion("type", [
  noAuthSchema,
  bearerTokenSchema,
  apiKeySchema,
]);

// Define the form schema for the MCP server configuration
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  apiAuth: z.record(
    z
      .object({
        serverUrl: z.string().optional(),
        useMockData: z.boolean().optional(),
        auth: authSchema,
      })
      .superRefine((data, ctx) => {
        // If useMockData is false, serverUrl is required
        if (
          !data.useMockData &&
          (!data.serverUrl || data.serverUrl.trim() === "")
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Server URL is required",
            path: ["serverUrl"],
          });
        }
      }),
  ),
});

// Type for form values
export type McpForm = z.infer<typeof formSchema>;

export type McpAuth = z.infer<typeof authSchema>;

export type McpSubmitData = Omit<McpData, "id" | "createdAt" | "updatedAt">;

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
  editMcpData?: McpData;
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
  const navigate = useNavigate();

  // Form setup with initial values based on edit mode
  const form = useForm<McpForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: isEditMode && editMcpData ? editMcpData.name : "",
      apiAuth: {},
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
      const updatedApiAuth = Object.keys(apiGroups).reduce(
        (acc, apiId) => {
          if (
            isEditMode &&
            editMcpData &&
            editMcpData.apiGroups &&
            editMcpData.apiGroups[apiId]
          ) {
            // In edit mode, use values from the existing MCP data
            acc[apiId] = {
              serverUrl: editMcpData.apiGroups[apiId].serverUrl || "",
              useMockData:
                editMcpData.apiGroups[apiId].useMockData !== undefined
                  ? editMcpData.apiGroups[apiId].useMockData
                  : true,
              auth: editMcpData.apiGroups[apiId].auth || { type: "noAuth" },
            };
          } else {
            // Preserve existing values if they exist, or use defaults
            acc[apiId] = currentApiAuth[apiId] || {
              serverUrl: "",
              useMockData: true,
              auth: { type: "noAuth" },
            };
          }
          return acc;
        },
        {} as Record<string, McpForm["apiAuth"][keyof McpForm["apiAuth"]]>,
      );

      // Update form values
      form.setValue("apiAuth", updatedApiAuth);
    }
  }, [apiGroups, form, isEditMode, editMcpData]);

  // Handle form submission
  const onSubmit: SubmitHandler<McpForm> = async (data) => {
    try {
      setIsSubmitting(true);

      // Create MCP configuration in the database
      // First, create a copy of the form data
      const mcpData: McpSubmitData = {
        name: data.name,
        transport: "http",
        apiGroups: {},
      };

      // Add endpoints to each API group
      Object.entries(data.apiAuth).forEach(([apiId, apiConfig]) => {
        mcpData.apiGroups[apiId] = {
          ...apiConfig,
          name: apiGroups[apiId]?.apiName,
          // Include the endpoints for this API
          endpoints: apiGroups[apiId]?.endpoints || [],
        };
      });

      let mcpId: string | undefined;

      // Use the mutations from useMcps
      if (isEditMode && editMcpId) {
        // Update existing MCP
        await updateMcpMutation(
          {
            mcpId: editMcpId,
            mcpData,
          },
          {
            onSuccess: () => {
              mcpId = editMcpId;
              toast.success(`MCP server '${data.name}' updated successfully.`);

              // Call the onServerStart callback if provided
              if (onServerStart) {
                onServerStart(mcpId);
              }

              // Close the dialog
              onOpenChange(false);

              // Navigate to the McpPage
              navigate({ to: "/mcp/$mcpId", params: { mcpId } });
            },
            onError: (error: unknown) => {
              toast.error(
                `Failed to update MCP server: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            },
          },
        );
      } else {
        // Create new MCP
        await createMcp(
          {
            mcpData,
          },
          {
            onSuccess: (result: {
              success: boolean;
              mcpId?: string;
              message?: string;
            }) => {
              if (result.mcpId) {
                mcpId = result.mcpId;
                toast.success(
                  `MCP server '${data.name}' created successfully.`,
                );

                // Call the onServerStart callback if provided
                if (onServerStart) {
                  onServerStart(mcpId);
                }

                // Close the dialog
                onOpenChange(false);

                // Navigate to the McpPage
                navigate({ to: "/mcp/$mcpId", params: { mcpId } });
              } else {
                toast.error("Failed to create MCP server: No MCP ID returned");
              }
            },
            onError: (error: unknown) => {
              toast.error(
                `Failed to create MCP server: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            },
          },
        );
      }
    } catch (error) {
      console.error("Error saving MCP configuration:", error);
      toast.error(
        "An unexpected error occurred while saving the MCP configuration.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none">
        <div className="flex flex-shrink-0 items-center justify-between border-b p-6">
          <DialogHeader>
            <DialogTitle>Start MCP Server</DialogTitle>
            <DialogDescription>
              Almost there! Tell us which authentication method you want to use
              for each API.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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

        <DialogFooter className="flex items-center justify-end gap-2 border-t p-6">
          <DialogClose asChild>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
                ? "Restart Server"
                : "Start Server"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
