# TICKET_006: Dataset Management Actions

## Summary
Enhance the dataset navigation with comprehensive management actions including proper confirmation dialogs, improved export functionality, and better error handling for all dataset operations.

## Acceptance Criteria
- [ ] Implement confirmation dialog for dataset deletion
- [ ] Enhance export functionality with multiple formats
- [ ] Add dataset duplication feature
- [ ] Implement batch operations (select multiple datasets)
- [ ] Add dataset import functionality
- [ ] Improve error handling and user feedback
- [ ] Add keyboard shortcuts for common actions

## Technical Requirements

### Files to Create/Modify
- `src/components/dataset-nav/DatasetActionsDialog.tsx` (new)
- `src/components/dataset-nav/ConfirmDeleteDialog.tsx` (new)
- `src/components/dataset-nav/ImportDatasetDialog.tsx` (new)
- `src/components/dataset-nav/DatasetNav.tsx` (modify)
- `src/components/dataset-nav/DatasetItem.tsx` (modify)

## Enhanced Action Implementations

### 1. Confirmation Dialog for Deletion
```typescript
// src/components/dataset-nav/ConfirmDeleteDialog.tsx
interface ConfirmDeleteDialogProps {
  dataset: DatasetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ 
  dataset, 
  open, 
  onOpenChange, 
  onConfirm 
}: ConfirmDeleteDialogProps) {
  if (!dataset) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{dataset.name}"? This action cannot be undone.
            <br />
            <br />
            This dataset contains {dataset.messages.length} messages and will be permanently removed from your local storage.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Dataset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### 2. Enhanced Export with Multiple Formats
```typescript
interface ExportFormat {
  label: string;
  extension: string;
  mimeType: string;
  transformer: (dataset: DatasetItem) => string;
}

const exportFormats: ExportFormat[] = [
  {
    label: "JSON (Complete)",
    extension: "json",
    mimeType: "application/json",
    transformer: (dataset) => JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      dataset,
      metadata: {
        messageCount: dataset.messages.length,
        appVersion: packageJson.version,
      },
    }, null, 2),
  },
  {
    label: "JSON (Messages Only)",
    extension: "json",
    mimeType: "application/json",
    transformer: (dataset) => JSON.stringify({
      name: dataset.name,
      messages: dataset.messages,
      systemPrompt: dataset.systemPrompt,
    }, null, 2),
  },
  {
    label: "Markdown",
    extension: "md",
    mimeType: "text/markdown",
    transformer: (dataset) => {
      let content = `# ${dataset.name}\n\n`;
      if (dataset.description) {
        content += `${dataset.description}\n\n`;
      }
      if (dataset.systemPrompt) {
        content += `## System Prompt\n\n${dataset.systemPrompt}\n\n`;
      }
      content += `## Conversation\n\n`;
      dataset.messages.forEach((message, index) => {
        content += `### ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n`;
        content += `${getMessageContent(message)}\n\n`;
      });
      return content;
    },
  },
  {
    label: "Plain Text",
    extension: "txt",
    mimeType: "text/plain",
    transformer: (dataset) => {
      let content = `${dataset.name}\n${'='.repeat(dataset.name.length)}\n\n`;
      dataset.messages.forEach((message) => {
        content += `${message.role.toUpperCase()}: ${getMessageContent(message)}\n\n`;
      });
      return content;
    },
  },
];

const handleExportDataset = (dataset: DatasetItem, format: ExportFormat) => {
  try {
    const content = format.transformer(dataset);
    const blob = new Blob([content], { type: format.mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataset.name.replace(/[^a-zA-Z0-9]/g, "_")}.${format.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Dataset exported",
      description: `"${dataset.name}" has been exported as ${format.label}`,
    });
  } catch (error) {
    toast({
      title: "Export failed",
      description: "Failed to export dataset. Please try again.",
      variant: "destructive",
    });
  }
};
```

### 3. Dataset Duplication Feature
```typescript
const handleDuplicateDataset = (dataset: DatasetItem) => {
  try {
    const duplicatedData: Omit<DatasetItem, 'id' | 'createdAt' | 'updatedAt'> = {
      ...dataset,
      name: `${dataset.name} (Copy)`,
    };
    
    const newId = addDataset(duplicatedData);
    
    toast({
      title: "Dataset duplicated",
      description: `"${duplicatedData.name}" has been created`,
    });
    
    return newId;
  } catch (error) {
    toast({
      title: "Duplication failed",
      description: "Failed to duplicate dataset. Please try again.",
      variant: "destructive",
    });
  }
};
```

### 4. Dataset Import Functionality
```typescript
// src/components/dataset-nav/ImportDatasetDialog.tsx
interface ImportDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (datasetId: string) => void;
}

export function ImportDatasetDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: ImportDatasetDialogProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileImport = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid file type",
        description: "Please select a JSON file.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate dataset structure
      if (!isValidDatasetStructure(data)) {
        throw new Error("Invalid dataset structure");
      }
      
      // Extract dataset from export format or use directly
      const dataset = data.dataset || data;
      
      const datasetData: Omit<DatasetItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: dataset.name,
        description: dataset.description,
        tags: dataset.tags,
        messages: dataset.messages,
        systemPrompt: dataset.systemPrompt,
        model: dataset.model,
        settings: dataset.settings || { temperature: 0, maxTokens: 4096 },
      };
      
      const newId = addDataset(datasetData);
      
      toast({
        title: "Dataset imported",
        description: `"${dataset.name}" has been imported successfully`,
      });
      
      onSuccess?.(newId);
      onOpenChange(false);
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import dataset. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Drag and drop implementation
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Dataset</DialogTitle>
          <DialogDescription>
            Import a dataset from a JSON file exported from Summon or compatible format.
          </DialogDescription>
        </DialogHeader>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop a JSON file here, or click to select
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Select File"}
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileImport(file);
          }}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Batch Operations
```typescript
// Add to DatasetNav state
const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
const [selectionMode, setSelectionMode] = useState(false);

// Batch operations
const handleBatchDelete = () => {
  const count = selectedDatasets.size;
  const names = Array.from(selectedDatasets).map(id => 
    datasets.find(d => d.id === id)?.name
  ).filter(Boolean).join(", ");
  
  if (confirm(`Delete ${count} dataset${count > 1 ? 's' : ''}?\n\n${names}`)) {
    selectedDatasets.forEach(id => deleteDataset(id));
    setSelectedDatasets(new Set());
    setSelectionMode(false);
    
    toast({
      title: "Datasets deleted",
      description: `${count} dataset${count > 1 ? 's' : ''} deleted successfully`,
    });
  }
};

const handleBatchExport = (format: ExportFormat) => {
  const datasetsToExport = Array.from(selectedDatasets).map(id =>
    datasets.find(d => d.id === id)
  ).filter(Boolean);
  
  // Create zip file with multiple datasets
  // Implementation depends on whether you want to use a zip library
  // For now, export as single JSON with multiple datasets
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    datasets: datasetsToExport,
    metadata: {
      count: datasetsToExport.length,
      totalMessages: datasetsToExport.reduce((sum, dataset) => sum + dataset.messages.length, 0),
    },
  };
  
  const content = JSON.stringify(exportData, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `datasets_export_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  
  toast({
    title: "Datasets exported",
    description: `${datasetsToExport.length} datasets exported successfully`,
  });
};
```

### 6. Keyboard Shortcuts
```typescript
// Add to DatasetNav component
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'i':
          e.preventDefault();
          setShowImportDialog(true);
          break;
        case 'a':
          if (selectionMode) {
            e.preventDefault();
            setSelectedDatasets(new Set(datasets.map(d => d.id)));
          }
          break;
        case 'Escape':
          if (selectionMode) {
            setSelectedDatasets(new Set());
            setSelectionMode(false);
          }
          break;
      }
    }
    
    if (e.key === 'Delete' && selectedDatasets.size > 0) {
      e.preventDefault();
      handleBatchDelete();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [datasets, selectedDatasets, selectionMode]);
```

## Enhanced Error Handling

### Storage Quota Management
```typescript
const handleStorageError = (error: Error) => {
  if (error.name === 'QuotaExceededError') {
    toast({
      title: "Storage limit exceeded",
      description: "Please delete some datasets to free up space.",
      variant: "destructive",
      action: (
        <ToastAction
          altText="Manage storage"
          onClick={() => {
            // Open storage management dialog
            setShowStorageDialog(true);
          }}
        >
          Manage
        </ToastAction>
      ),
    });
  } else {
    toast({
      title: "Operation failed",
      description: error.message || "An unexpected error occurred.",
      variant: "destructive",
    });
  }
};
```

### Validation Utilities
```typescript
const isValidDatasetStructure = (data: any): boolean => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    Array.isArray(data.messages) &&
    data.messages.every(isValidMessage)
  );
};

const isValidMessage = (message: any): boolean => {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.role === 'string' &&
    Array.isArray(message.parts)
  );
};
```

## Dependencies
- **TICKET_001** (Core Dataset Store) - Required for data operations
- **TICKET_004** (Dataset Navigation Component) - Required component
- Existing UI components: AlertDialog, Toast, Button, etc.

## Testing Requirements
- Test all action dialogs work correctly
- Test batch operations with multiple datasets
- Test import/export functionality with various file formats
- Test keyboard shortcuts
- Test error handling for storage issues
- Test validation of imported data
- Test drag and drop import functionality

## Estimated Effort
**10 hours**

## Definition of Done
- [ ] Confirmation dialog implemented for deletion
- [ ] Enhanced export with multiple formats works
- [ ] Dataset duplication functionality works
- [ ] Batch operations implemented (select, delete, export)
- [ ] Import functionality with drag-and-drop works
- [ ] Keyboard shortcuts implemented
- [ ] Comprehensive error handling added
- [ ] Storage quota management implemented
- [ ] All validation functions work correctly
- [ ] User feedback (toasts) work for all operations 