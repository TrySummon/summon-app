import React, { useState } from "react";
import { FileJson, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/tailwind";
import { useNavigate } from "@tanstack/react-router";



interface ImportApiDialogProps {
  children: React.ReactNode;
  onImport?: (file: File) => void;
}

export function ImportApiDialog({ 
  children, 
  onImport = () => {}
}: ImportApiDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileChange = (file: File | null) => {    
    if (!file) {
      setFile(null);
      return;
    }
    
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'json' && extension !== 'yaml' && extension !== 'yml') {
      setFile(null);
      return;
    }
    
    setFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (file) {
      setIsLoading(true);
      
      const importPromise = new Promise<void>(async (resolve, reject) => {
        try {
          // If we're in an Electron environment, use IPC
            const result = await window.openapi.import(file);
            
            if (result.success) {
              // Invalidate the APIs query to refresh the list
              queryClient.invalidateQueries({ queryKey: ['apis'] });
              setFile(null);
              setOpen(false);
              
              // Navigate to the API page if we have an API ID
              if (result.apiId) {
                // Use a small timeout to allow the query invalidation to complete
                setTimeout(() => {
                  navigate({ to: "/api/$apiId", params: { apiId: result.apiId } });
                }, 100);
              }
              
              resolve();
            } else {
              reject(new Error(result.message || 'Failed to import API'));
            }
         
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
          reject(new Error(errorMessage));
        } finally {
          setIsLoading(false);
        }
      });
      
      toast.promise(importPromise, {
        loading: 'Importing API...',
        success: (result: any) => {
          return `API imported successfully!${result?.apiId ? ` ID: ${result.apiId}` : ''}`;
        },
        error: (err) => err.message || 'Failed to import API',
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
            Upload an OpenAPI specification file (JSON format only). We only support OpenAPI Spec 3.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              file ? "bg-primary/5" : "hover:bg-muted/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex w-full flex-col items-center gap-2">
                <FileJson className="h-10 w-10 text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove file</span>
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-full bg-primary/10 p-3">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="mb-2 text-sm font-medium">
                  Drag and drop your OpenAPI specification
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Supports JSON files
                </p>
                <label htmlFor="file-upload">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="relative cursor-pointer"
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    Browse files
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              </>
            )}
          </div>
          
        </div>
        
        <DialogFooter className="flex items-center justify-end space-x-2">
          <DialogTrigger asChild>
            <Button variant="outline">
              Cancel
            </Button>
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
