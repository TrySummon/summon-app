import React, { useState } from "react";
import { FileJson, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/tailwind";

// Define the interface for the electron API
declare global {
  interface Window {
    require: (module: string) => any;
    electron: {
      importCollection: {
        import: (file: File, options: ImportApiOptions) => Promise<{ success: boolean; message?: string }>;
      };
    };
  }
}

// Define the options interface
export interface ImportApiOptions {
  ignoreDeprecated: boolean;
  ignoreOptionalParams: boolean;
}

interface ImportApiDialogProps {
  children: React.ReactNode;
  onImport?: (file: File, options: ImportApiOptions) => void;
}

export function ImportApiDialog({ 
  children,
  onImport = () => {}
}: ImportApiDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState<ImportApiOptions>({
    ignoreDeprecated: false,
    ignoreOptionalParams: false,
  });
  
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
          if (window.electron?.importCollection) {
            const result = await window.electron.importCollection.import(file, options);
            
            if (result.success) {
              setFile(null);
              setOpen(false);
              resolve();
            } else {
              reject(new Error(result.message || "Failed to import collection"));
            }
          } else {
            // Fallback to the prop callback for non-Electron environments
            onImport(file, options);
            setFile(null);
            setOpen(false);
            resolve();
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
          reject(new Error(errorMessage));
        } finally {
          setIsLoading(false);
        }
      });
      
      toast.promise(importPromise, {
        loading: 'Importing collection...',
        success: 'Collection imported successfully!',
        error: (err) => err.message || 'Failed to import collection',
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
            Import Collection
          </DialogTitle>
          <DialogDescription>
            Upload an OpenAPI specification file (JSON or YAML) to import as a collection.
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
                  Supports JSON and YAML files
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
                    accept=".json,.yaml,.yml"
                    className="sr-only"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  />
                </label>
              </>
            )}
          </div>
          
          {/* Options */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ignore-deprecated" 
                checked={options.ignoreDeprecated}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, ignoreDeprecated: checked === true }))
                }
              />
              <Label 
                htmlFor="ignore-deprecated" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Ignore deprecated endpoints
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ignore-optional" 
                checked={options.ignoreOptionalParams}
                onCheckedChange={(checked) => 
                  setOptions(prev => ({ ...prev, ignoreOptionalParams: checked === true }))
                }
              />
              <Label 
                htmlFor="ignore-optional" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Ignore optional parameters
              </Label>
            </div>
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
