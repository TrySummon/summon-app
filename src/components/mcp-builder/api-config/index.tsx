import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { McpApiGroup } from "@/lib/db/mcp-db";
import { Form } from "@/components/ui/form";
import { ApiGroupSection } from "./ApiGroupSection";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from "lucide-react";

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
  configuredAuth: z.record(
    z.string(),
    z
      .object({
        serverUrl: z.string().optional(),
        useMockData: z.boolean().optional(),
        toolPrefix: z.string(),
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

export type ApiConfigs = Record<
  string,
  {
    serverUrl?: string;
    useMockData?: boolean;
    toolPrefix: string;
    auth: McpAuth;
  }
>;

interface ApiConfigProps {
  apiGroups?: Record<string, McpApiGroup>;
  onSave: (configData: ApiConfigs) => void;
}

export function ApiConfig({ apiGroups, onSave }: ApiConfigProps) {
  // Add state for dialog open/close
  const [open, setOpen] = React.useState(false);

  // Form setup with initial values
  const form = useForm<McpForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      configuredAuth: {},
    },
    mode: "onChange",
  });

  // Update form values when apiGroups changes
  useEffect(() => {
    if (apiGroups && Object.keys(apiGroups).length > 0) {
      // Get current form values
      const currentValues = form.getValues();
      const currentApiAuth = currentValues.configuredAuth || {};

      // Create updated apiAuth object with apiGroups data
      const updatedAuth: Record<
        string,
        {
          serverUrl?: string;
          useMockData?: boolean;
          toolPrefix: string;
          auth: McpAuth;
        }
      > = Object.keys(apiGroups).reduce(
        (acc, apiId) => {
          const group = apiGroups[apiId];
          if (group) {
            // Use values from the existing MCP data
            acc[apiId] = {
              serverUrl: group.serverUrl || "",
              useMockData:
                group.useMockData !== undefined ? group.useMockData : true,
              toolPrefix: group.toolPrefix || "",
              auth: group.auth || { type: "noAuth" },
            };
          } else {
            // Preserve existing values if they exist, or use defaults
            acc[apiId] = currentApiAuth[apiId] || {
              serverUrl: "",
              useMockData: true,
              toolPrefix: "",
              auth: { type: "noAuth" },
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            serverUrl?: string;
            useMockData?: boolean;
            toolPrefix: string;
            auth: McpAuth;
          }
        >,
      );

      // Update form values
      form.setValue("configuredAuth", updatedAuth);
    }
  }, [apiGroups, form]);

  if (!apiGroups) return null;

  // Handle form submission
  const onSubmit: SubmitHandler<McpForm> = async (data) => {
    try {
      onSave(data.configuredAuth);
      // Close the dialog after successful save
      setOpen(false);
    } catch (error) {
      console.error("Error saving MCP configuration:", error);
      toast.error(
        "An unexpected error occurred while saving the MCP configuration.",
      );
    }
  };

  // Convert apiGroups to the format expected by ApiGroupSection
  const apiGroupsForForm = Object.entries(apiGroups || {}).map(
    ([apiId, group]) => ({
      apiId,
      apiName: group.name,
      endpoints: group.tools || [], // Use tools as endpoints for compatibility
    }),
  );

  // Calculate mocked vs connected APIs
  const apiCounts = Object.values(apiGroups || {}).reduce(
    (acc, group) => {
      if (group.useMockData !== false) {
        acc.mocked++;
      } else {
        acc.connected++;
      }
      return acc;
    },
    { mocked: 0, connected: 0 },
  );

  // Generate button text based on counts
  const getButtonText = () => {
    const { mocked, connected } = apiCounts;
    const total = mocked + connected;

    if (total === 0) return "Configure APIs";

    const parts = [];
    if (mocked > 0)
      parts.push(`${mocked} API${mocked === 1 ? "" : "s"} mocked`);
    if (connected > 0)
      parts.push(`${connected} API${connected === 1 ? "" : "s"} connected`);

    return parts.join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!apiGroups || Object.keys(apiGroups).length === 0}
        >
          <Settings className="mr-2 size-4" />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-5/6 w-[90vw] flex-col sm:max-w-none">
        <div className="flex-1 space-y-6 overflow-y-auto p-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                {apiGroupsForForm.map((api, index) => (
                  <ApiGroupSection
                    key={api.apiId}
                    api={api}
                    form={form}
                    isLast={index === apiGroupsForForm.length - 1}
                  />
                ))}
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
