import React, { useState, useEffect } from "react";
import { toast } from "sonner";

import { useLocalDatasets } from "@/hooks/useLocalDatasets";

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
import { Label } from "@/components/ui/label";

interface CreateDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (datasetId: string) => void;
}

interface FormState {
  name: string;
  description: string;
  tags: string[];
}

interface FormErrors {
  name?: string;
  description?: string;
  tags?: string;
}

export function CreateDatasetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateDatasetDialogProps) {
  const { addDataset, datasets } = useLocalDatasets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    name: "",
    description: "",
    tags: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        name: "",
        description: "",
        tags: [],
      });
      setErrors({});
    }
  }, [open]);

  // Validation function
  const validateForm = (state: FormState): FormErrors => {
    const newErrors: FormErrors = {};

    // Name validation
    const trimmedName = state.name.trim();
    if (!trimmedName) {
      newErrors.name = "Dataset name is required";
    } else if (trimmedName.length > 100) {
      newErrors.name = "Dataset name must be 100 characters or less";
    } else {
      // Check for duplicate names (case-insensitive)
      const isDuplicate = datasets.some(
        (dataset) => dataset.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (isDuplicate) {
        newErrors.name = "A dataset with this name already exists";
      }
    }

    // Description validation
    if (state.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    // Tags validation
    if (state.tags.length > 10) {
      newErrors.tags = "Maximum 10 tags allowed";
    }

    return newErrors;
  };

  // Handle input changes with validation
  const handleInputChange = (
    field: keyof FormState,
    value: string | string[],
  ) => {
    const newState = { ...formState, [field]: value };
    setFormState(newState);

    // Clear field-specific errors when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formState);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Auto-fix duplicate name if needed
      let finalName = formState.name.trim();
      if (
        datasets.some(
          (dataset) => dataset.name.toLowerCase() === finalName.toLowerCase(),
        )
      ) {
        finalName = generateUniqueName(finalName);
      }

      const datasetId = addDataset({
        name: finalName,
        description: formState.description.trim() || undefined,
        tags: formState.tags.length > 0 ? formState.tags : undefined,
        // No initial item - creating an empty dataset
      });

      toast.success("Dataset created", {
        description: `"${finalName}" has been created successfully.`,
      });

      onSuccess?.(datasetId);
      onOpenChange(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error("Failed to create dataset", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Check if form is valid
  const isValid =
    formState.name.trim().length > 0 &&
    formState.name.trim().length <= 100 &&
    formState.description.length <= 500 &&
    formState.tags.length <= 10 &&
    Object.keys(errors).length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Dataset</DialogTitle>
          <DialogDescription>
            Create a new dataset to organize your conversations and experiments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dataset Name */}
          <div className="space-y-2">
            <Label htmlFor="dataset-name">
              Dataset Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dataset-name"
              value={formState.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter dataset name"
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby={errors.name ? "name-error" : "name-help"}
            />
            <div className="flex items-center justify-between text-sm">
              <span id="name-help" className="text-muted-foreground">
                {formState.name.length}/100 characters
              </span>
              {errors.name && (
                <span id="name-error" className="text-destructive" role="alert">
                  {errors.name}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="dataset-description">Description</Label>
            <Textarea
              id="dataset-description"
              value={formState.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Optional description for this dataset"
              rows={3}
              aria-invalid={errors.description ? "true" : "false"}
              aria-describedby={
                errors.description ? "description-error" : "description-help"
              }
            />
            <div className="flex items-center justify-between text-sm">
              <span id="description-help" className="text-muted-foreground">
                {formState.description.length}/500 characters
              </span>
              {errors.description && (
                <span
                  id="description-error"
                  className="text-destructive"
                  role="alert"
                >
                  {errors.description}
                </span>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="dataset-tags">Tags</Label>
            <ChipInput
              id="dataset-tags"
              tags={formState.tags}
              onValueChange={(tags) => handleInputChange("tags", tags)}
              placeholder="Add tags (press Enter to add)"
              wrapperClassName="space-y-2"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formState.tags.length}/10 tags
              </span>
              {errors.tags && (
                <span className="text-destructive" role="alert">
                  {errors.tags}
                </span>
              )}
            </div>
          </div>
        </form>

        <DialogFooter>
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
            onClick={handleSubmit}
          >
            {isSubmitting ? "Creating..." : "Create Dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
