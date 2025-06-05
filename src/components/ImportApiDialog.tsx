import React, { useState, useCallback } from "react";
import { FileJson, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { useNavigate } from "@tanstack/react-router";
import { LIST_API_QUERY_KEY } from "@/hooks/useApis";
import { importApi } from "@/ipc/openapi/openapi-client";

interface ImportApiDialogProps {
  children: React.ReactNode;
  preventNavigation?: boolean;
}

export function ImportApiDialog({
  children,
  preventNavigation = false,
}: ImportApiDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      // Check file extension
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (extension !== "json" && extension !== "yaml" && extension !== "yml") {
        toast.error("Only JSON, YAML, and YML files are supported");
        return;
      }

      setFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        "application/json": [".json"],
        "application/x-yaml": [".yaml", ".yml"],
      },
      maxFiles: 1,
    });

  const handleImport = async () => {
    if (file) {
      setIsLoading(true);

      toast.promise(importApi(file), {
        loading: "Importing API...",
        success: (result) => {
          setIsLoading(false);
          queryClient.invalidateQueries({ queryKey: [LIST_API_QUERY_KEY] });
          setFile(null);
          setOpen(false);

          // Navigate to the API page if we have an API ID
          if (!preventNavigation && result.apiId) {
            // Use a small timeout to allow the query invalidation to complete
            setTimeout(() => {
              navigate({
                to: "/api/$apiId",
                params: { apiId: result.apiId! },
              });
            }, 100);
          }
          return `API imported successfully!${result?.apiId ? ` ID: ${result.apiId}` : ""}`;
        },
        error: (err) => {
          setIsLoading(false);
          return err.message || "Failed to import API";
        },
      });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => setOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import API
          </DialogTitle>
          <DialogDescription>
            Upload an OpenAPI specification file (JSON format only). We only
            support OpenAPI Spec 3.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div
            {...getRootProps()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              isDragActive && !isDragReject
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25",
              isDragReject ? "border-destructive bg-destructive/5" : "",
              file ? "bg-primary/5" : "hover:bg-muted/50",
            )}
          >
            {file ? (
              <div className="flex w-full flex-col items-center gap-2">
                <FileJson className="text-primary h-10 w-10" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-muted-foreground text-xs">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-primary/10 mb-4 rounded-full p-3">
                  <Upload className="text-primary h-6 w-6" />
                </div>
                <p className="mb-2 text-sm font-medium">
                  Drag and drop your OpenAPI specification
                </p>
                <p className="text-muted-foreground mb-4 text-xs">
                  Supports JSON files
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="relative cursor-pointer"
                  type="button"
                >
                  Browse files
                </Button>
                <input {...getInputProps()} />
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end space-x-2">
          <DialogTrigger asChild>
            <Button variant="outline">Cancel</Button>
          </DialogTrigger>
          <Button
            onClick={handleImport}
            disabled={!file || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
