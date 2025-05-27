import React, { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DialogDescription } from '@radix-ui/react-dialog';
import { AIProviderType, AI_PROVIDERS_CONFIG } from './types';
import { Button } from '@/components/ui/button';
import ProviderLogo from './Logo';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ChipInput from '../ChipInput';

// Create a schema for the credential form
const baseCredentialSchema = z.object({
  form: z.never().nullish(),
  type: z.nativeEnum(AIProviderType),
  name: z.string().optional(),
  apiKey: z.string().min(1, 'API key is required'),
});

// Extended schemas for specific providers
const azureOpenAISchema = baseCredentialSchema.extend({
  resourceName: z.string().min(1, 'Resource name is required'),
  apiVersion: z.string().min(1, 'API version is required'),
  deploymentId: z.array(z.string()).min(1, 'At least one deployment ID is required'),
});

const amazonBedrockSchema = baseCredentialSchema.extend({
  secretKey: z.string().min(1, 'Secret key is required'),
  region: z.string().min(1, 'Region is required'),
});

const customProviderSchema = baseCredentialSchema.extend({
  name: z.string().min(1, 'Provider name is required'),
  baseUrl: z.string().url('Must be a valid URL'),
  models: z.array(z.string()).min(1, 'At least one model is required'),
});

// Union type for all possible credential schemas
const credentialSchema = z.discriminatedUnion('type', [
  baseCredentialSchema.extend({ type: z.literal(AIProviderType.OpenAI) }),
  baseCredentialSchema.extend({ type: z.literal(AIProviderType.Anthropic) }),
  baseCredentialSchema.extend({ type: z.literal(AIProviderType.Mistral) }),
  baseCredentialSchema.extend({ type: z.literal(AIProviderType.Grok) }),
  baseCredentialSchema.extend({ type: z.literal(AIProviderType.Google) }),
  azureOpenAISchema.extend({ type: z.literal(AIProviderType.AzureOpenAI) }),
  amazonBedrockSchema.extend({ type: z.literal(AIProviderType.AWSBedrock) }),
  customProviderSchema.extend({ type: z.literal(AIProviderType.Custom) }),
]);

export type CredentialFormValues = z.infer<typeof credentialSchema>;

interface CredentialDialogProps {
  children?: React.ReactNode;
  providerId?: string;
  providerType: AIProviderType;
  defaultValues?: Partial<CredentialFormValues>;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onSave?: (credential: CredentialFormValues) => void;
}

export const CredentialDialog: React.FC<CredentialDialogProps> = ({
  children,
  providerId,
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

  // Create form with dynamic validation based on provider type
  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      type: providerType,
      ...defaultValues,
    } as any, // Use type assertion to avoid TypeScript errors with discriminated unions
    mode: 'onChange', // Validate on change to update isValid state
  });

  // Watch the provider type to update validation when it changes
  const currentType = form.watch('type') as AIProviderType;

  console.log(form.formState)

  // Reset form fields when provider type changes
  useEffect(() => {
    if (currentType !== providerType) {
      // Reset fields except for the type
      form.reset({ 
        type: providerType, // Always use the providerType prop to avoid type issues
        ...defaultValues 
      } as any); // Use type assertion to avoid TypeScript errors with discriminated unions
    }
  }, [currentType, defaultValues, form, providerType]);

  // Handle form submission
  const onSubmit = useCallback(
    (values: CredentialFormValues) => {
      try {
        console.log("Form values:", values);
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
        console.error('Error saving credential:', error);
        form.setError('form', { 
          message: error instanceof Error ? error.message : 'Failed to save credential' 
        });
      }
    },
    [form, onOpenChange, onSave]
  );

  // Render form fields based on provider configuration
  const renderFormFields = () => {
    return providerConfig.config.map((field) => (
      <FormField
        key={field.key}
        control={form.control}
        name={field.key as any}
        render={({ field: formField }) => (
          <FormItem className="w-full">
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              {field.type === 'list' ? (
                <ChipInput
                  tags={formField.value as string[] || []}
                  onValueChange={(value) => {
                    formField.onChange(value);
                  }}
                  placeholder={field.placeholder || ''}
                />
              ) : (
                <Input
                  {...formField}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder || ''}
                  type={field.type}
                  value={formField.value || ''}
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
  const dialogTitle = providerId
    ? `Update ${providerConfig.displayName} configuration`
    : `Configure ${providerConfig.displayName}`;

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
              <div className="text-sm text-muted-foreground">
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
                name="name"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Custom Provider Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder="My Custom Provider"
                        type="text"
                        value={field.value || ''}
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
              <div className="text-sm font-medium text-destructive">
                {form.formState.errors.form.message}
              </div>
            )}

            {/* Display test status */}
            {testStatus.message && (
              <div className={`text-sm font-medium ${testStatus.success ? 'text-green-600' : 'text-destructive'}`}>
                {testStatus.message}
              </div>
            )}
          </form>
        </Form>

        <DialogFooter>
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
