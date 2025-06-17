import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useDatasets } from "@/hooks/useDatasets";

import ChipInput from "@/components/ChipInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface CreateDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (datasetId: string) => void;
}

// Create form schema with validation
const createFormSchema = (existingDatasets: { name: string }[]) =>
  z.object({
    name: z
      .string()
      .min(1, "Dataset name is required")
      .max(100, "Dataset name must be 100 characters or less")
      .refine(
        (name) =>
          !existingDatasets.some(
            (dataset) =>
              dataset.name.toLowerCase() === name.trim().toLowerCase(),
          ),
        "A dataset with this name already exists",
      ),
    description: z
      .string()
      .max(500, "Description must be 500 characters or less"),
    tags: z.array(z.string()).max(10, "Maximum 10 tags allowed"),
  });

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

export function CreateDatasetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDatasetDialogProps) {
  const { addDataset, datasets } = useDatasets();

  // Create schema with current datasets for duplicate checking
  const formSchema = createFormSchema(datasets);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      tags: [],
    },
    mode: "onChange", // Validate on change for real-time feedback
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, isValid },
  } = form;

  // Watch form values for character counts
  const watchedName = watch("name");
  const watchedDescription = watch("description");
  const watchedTags = watch("tags");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        name: "",
        description: "",
        tags: [],
      });
    }
  }, [open, reset]);

  // Generate unique name if duplicate exists
  const generateUniqueName = (baseName: string): string => {
    let uniqueName = baseName;
    let counter = 1;

    while (
      datasets.some(
        (dataset) => dataset.name.toLowerCase() === uniqueName.toLowerCase(),
      )
    ) {
      uniqueName = `${baseName} (${counter})`;
      counter++;
    }

    return uniqueName;
  };

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      // Auto-fix duplicate name if needed
      let finalName = data.name.trim();
      if (
        datasets.some(
          (dataset) => dataset.name.toLowerCase() === finalName.toLowerCase(),
        )
      ) {
        finalName = generateUniqueName(finalName);
      }

      const result = await addDataset({
        name: finalName,
        description: data.description.trim() || undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        // No initial item - creating an empty dataset
      });

      toast.success("Dataset created", {
        description: `"${finalName}" has been created successfully.`,
      });

      onSuccess?.(result.id!);
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error("Failed to create dataset", {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Dataset</DialogTitle>
          <DialogDescription>
            Create a new dataset to organize your conversations and experiments.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Dataset Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Dataset Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter dataset name"
                        {...field}
                        aria-describedby="name-help"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-sm">
                      <span id="name-help" className="text-muted-foreground">
                        {watchedName.length}/100 characters
                      </span>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description for this dataset"
                        rows={3}
                        {...field}
                        aria-describedby="description-help"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-sm">
                      <span
                        id="description-help"
                        className="text-muted-foreground"
                      >
                        {watchedDescription.length}/500 characters
                      </span>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <ChipInput
                        tags={field.value}
                        onValueChange={field.onChange}
                        placeholder="Add tags (press Enter to add)"
                        wrapperClassName="space-y-2"
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {watchedTags.length}/10 tags
                      </span>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            type="button"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting ? "Creating..." : "Create Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
