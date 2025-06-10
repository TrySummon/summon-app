import React, { useState, useEffect, useCallback, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { DialogDescription } from "@radix-ui/react-dialog";
import {
  AIProviderCredential,
  AIProviderType,
  AI_PROVIDERS_CONFIG,
} from "./types";
import { Button } from "@/components/ui/button";
import ProviderLogo from "./Logo";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import ChipInput from "../ChipInput";
import { TestProviderButton } from "./TestButton";

export const credentialFormSchema = z
  .object({
    form: z.never().optional(),
    provider: z.nativeEnum(AIProviderType),
    key: z.string(),
    resourceName: z
      .string()
      .min(1, "Resource name must not be empty")
      .optional(),
    apiVersion: z.string().min(1, "API version must not be empty").optional(),
    models: z.array(z.string()).optional(),
    baseUrl: z
      .union([z.string().url(), z.literal("")])
      .optional()
      .transform((value) => {
        if (value?.trim().length === 0) {
          return undefined;
        }
        return value;
      }),
    displayName: z
      .string()
      .min(1, "Custom provider name is required.")
      .optional(),
  })
  .superRefine(function refineAzureOpenAI(data, ctx) {
    if (data.provider !== AIProviderType.AzureOpenAI) {
      return;
    }
    if (data.resourceName == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resourceName"],
        message: "Azure resource name must not be empty",
      });
    }
    if (data.apiVersion == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apiVersion"],
        message: "Azure API version must not be empty",
      });
    }
    if (!data.models?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["models"],
        message: "Please provide at least one model deployed on Azure.",
      });
    }
  });

export type CredentialFormValues = z.infer<typeof credentialFormSchema>;

interface CredentialDialogProps {
  children?: React.ReactNode;
  providerType: AIProviderType;
  defaultValues?: Partial<CredentialFormValues>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSave?: (credential: CredentialFormValues) => void;
}

export const CredentialDialog: React.FC<CredentialDialogProps> = ({
  children,
  providerType,
  defaultValues,
  isOpen,
  onOpenChange,
  onSave,
}) => {
  const [localOpen, setLocalOpen] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
  }>({ loading: false });

  // Get the provider configuration
  const providerConfig = AI_PROVIDERS_CONFIG[providerType];

  const resolver = useMemo(() => {
    return zodResolver(
      credentialFormSchema.superRefine(
        function refineCustomProvider(data, ctx) {
          if (providerType === AIProviderType.Custom) {
            if (!data.displayName) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["displayName"],
                message: "Custom provider name is required.",
              });
            }
            if (!data.models?.length) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["models"],
                message:
                  "At least one custom model is required for a custom provider.",
              });
            }
            if (!data.baseUrl) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["baseUrl"],
                message: "Base URL is required for a custom provider.",
              });
            }
          }
        },
      ),
    );
  }, [providerType]);

  // Create form with dynamic validation based on provider type
  const form = useForm<CredentialFormValues>({
    resolver,
    defaultValues: {
      provider: providerType,
      ...defaultValues,
    },
    mode: "onChange", // Validate on change to update isValid state
  });

  // Watch the provider type to update validation when it changes
  const currentType = form.watch("provider") as AIProviderType;

  // Watch all form values for the test button
  const formValues = useWatch({
    control: form.control,
    defaultValue: form.getValues(),
  });

  // Reset form fields when provider type changes
  useEffect(() => {
    if (currentType !== providerType) {
      // Reset fields except for the type
      form.reset({
        provider: providerType,
        ...defaultValues,
      });
    }
  }, [currentType, defaultValues, form, providerType]);

  // Handle form submission
  const onSubmit = useCallback(
    (values: CredentialFormValues) => {
      try {
        // Call onSave callback if provided
        if (onSave) {
          onSave(values);
        }

        // Close the dialog
        setLocalOpen(false);
        if (onOpenChange) {
          onOpenChange(false);
        }
      } catch (error) {
        console.error("Error saving credential:", error);
        form.setError("form", {
          message:
            error instanceof Error
              ? error.message
              : "Failed to save credential",
        });
      }
    },
    [form, onOpenChange, onSave],
  );

  // Render form fields based on provider configuration
  const renderFormFields = () => {
    return providerConfig.config.map((field) => (
      <FormField
        key={field.key}
        control={form.control}
        name={field.key}
        render={({ field: formField }) => (
          <FormItem className="w-full">
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              {field.type === "list" ? (
                <ChipInput
                  tags={(formField.value as string[]) || []}
                  onValueChange={(value) => {
                    formField.onChange(value);
                  }}
                  placeholder={field.placeholder || ""}
                />
              ) : (
                <Input
                  {...formField}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder || ""}
                  type={field.type}
                  value={formField.value || ""}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ));
  };

  // Generate dialog title
  const dialogTitle = `Configure ${providerType}`;

  return (
    <Dialog
      open={isOpen !== undefined ? isOpen : localOpen}
      onOpenChange={(open) => {
        if (onOpenChange) {
          onOpenChange(open);
        }
        setLocalOpen(open);
        if (!open) {
          // Reset test status when dialog closes
          setTestStatus({ loading: false });
        }
      }}
    >
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="capitalize">
            <div className="flex items-center gap-2 font-medium">
              <ProviderLogo
                svgString={providerConfig.logo}
                width={28}
                className="mr-1"
              />
              {dialogTitle}
            </div>
          </DialogTitle>
          {providerType === AIProviderType.AzureOpenAI && (
            <DialogDescription>
              <div className="text-muted-foreground text-sm">
                Check your Azure OpenAI documentation to map fields correctly.
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form
            className="flex w-full flex-col items-center gap-3"
            id="credentialForm"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            {providerType === AIProviderType.Custom && (
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Custom Provider Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder="My Custom Provider"
                        type="text"
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {renderFormFields()}

            {/* Display form-level errors */}
            {form.formState.errors.form && (
              <div className="text-destructive text-sm font-medium">
                {form.formState.errors.form.message}
              </div>
            )}

            {/* Display test status */}
            {testStatus.message && (
              <div
                className={`text-sm font-medium ${testStatus.success ? "text-green-600" : "text-destructive"}`}
              >
                {testStatus.message}
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
          <TestProviderButton
            disabled={!form.formState.isValid}
            credential={formValues as AIProviderCredential}
          />
          <Button
            className="ml-auto"
            type="submit"
            form="credentialForm"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CredentialDialog;
