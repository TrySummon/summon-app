# TICKET_007: Load Dataset to Playground Functionality

## Summary
Implement the ability to load saved datasets into new playground tabs, allowing users to continue conversations or use datasets as starting points for new interactions.

## Acceptance Criteria
- [ ] Add loadDatasetToPlayground method to playground store
- [ ] Implement dataset loading action in DatasetNav
- [ ] Create new playground tab with dataset content
- [ ] Handle different loading modes (continue vs. template)
- [ ] Add loading confirmation dialog with options
- [ ] Preserve dataset metadata in playground tab
- [ ] Handle edge cases and error states

## Technical Requirements

### Files to Modify
- `src/components/playground/store.ts`
- `src/components/dataset-nav/DatasetNav.tsx`
- `src/components/dataset-nav/DatasetItem.tsx`

### Files to Create
- `src/components/dataset-nav/LoadDatasetDialog.tsx`

## Core Implementation

### 1. Playground Store Extension
```typescript
// Add to src/components/playground/store.ts

export interface PlaygroundStore {
  // ... existing properties ...
  
  // New method for loading datasets
  loadDatasetToNewTab: (
    dataset: DatasetItem, 
    options?: LoadDatasetOptions
  ) => string;
}

interface LoadDatasetOptions {
  mode: 'continue' | 'template';
  preserveHistory: boolean;
  customName?: string;
}

// Implementation in store
loadDatasetToNewTab: (dataset: DatasetItem, options: LoadDatasetOptions = { 
  mode: 'continue', 
  preserveHistory: true 
}) => {
  try {
    // Prepare initial state from dataset
    const initialState: Partial<IPlaygroundTabState> = {
      messages: options.mode === 'continue' 
        ? [...dataset.messages] 
        : [], // Empty for template mode
      systemPrompt: dataset.systemPrompt,
      model: dataset.model,
      settings: {
        ...createDefaultState().settings,
        ...dataset.settings,
      },
      enabledTools: {}, // Reset tools - user can re-configure
      modifiedToolMap: {}, // Reset tool modifications
    };

    // Create tab name
    const tabName = options.customName || 
      (options.mode === 'continue' 
        ? `${dataset.name}` 
        : `${dataset.name} (Template)`);

    // Create the new tab
    const tabId = get().createTab(initialState, tabName);

    // If preserveHistory is true and mode is continue, add dataset info to history
    if (options.preserveHistory && options.mode === 'continue') {
      get().updateCurrentState(
        (state) => ({
          ...state,
          // Add metadata about the loaded dataset
          datasetId: dataset.id,
          datasetName: dataset.name,
          loadedAt: new Date().toISOString(),
        }),
        true,
        `Loaded dataset: ${dataset.name}`
      );
    }

    return tabId;
  } catch (error) {
    console.error('Failed to load dataset to playground:', error);
    throw new Error('Failed to load dataset. Please try again.');
  }
},
```

### 2. Load Dataset Dialog
```typescript
// src/components/dataset-nav/LoadDatasetDialog.tsx
interface LoadDatasetDialogProps {
  dataset: DatasetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataset: DatasetItem, options: LoadDatasetOptions) => void;
}

export function LoadDatasetDialog({
  dataset,
  open,
  onOpenChange,
  onConfirm,
}: LoadDatasetDialogProps) {
  const [mode, setMode] = useState<'continue' | 'template'>('continue');
  const [customName, setCustomName] = useState('');
  const [preserveHistory, setPreserveHistory] = useState(true);

  useEffect(() => {
    if (dataset) {
      setCustomName('');
    }
  }, [dataset]);

  if (!dataset) return null;

  const handleConfirm = () => {
    const options: LoadDatasetOptions = {
      mode,
      preserveHistory,
      customName: customName.trim() || undefined,
    };

    onConfirm(dataset, options);
    onOpenChange(false);
  };

  const previewName = customName.trim() || 
    (mode === 'continue' ? dataset.name : `${dataset.name} (Template)`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Load Dataset to Playground</DialogTitle>
          <DialogDescription>
            Choose how you want to load "{dataset.name}" into a new playground tab.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading Mode Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Loading Mode</Label>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="continue"
                  id="continue"
                  checked={mode === 'continue'}
                  onChange={() => setMode('continue')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="continue" className="font-medium">
                    Continue Conversation
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Load all messages and continue from where the conversation left off.
                    You can add new messages to extend the conversation.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem
                  value="template"
                  id="template"
                  checked={mode === 'template'}
                  onChange={() => setMode('template')}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="template" className="font-medium">
                    Use as Template
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Start with just the system prompt and settings. 
                    Messages are cleared for a fresh conversation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Tab Name */}
          <div className="space-y-2">
            <Label htmlFor="tab-name" className="text-sm font-medium">
              Tab Name (Optional)
            </Label>
            <Input
              id="tab-name"
              placeholder={mode === 'continue' ? dataset.name : `${dataset.name} (Template)`}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Preview: "{previewName}"
            </p>
          </div>

          {/* Options */}
          {mode === 'continue' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="preserve-history"
                checked={preserveHistory}
                onCheckedChange={(checked) => setPreserveHistory(!!checked)}
              />
              <Label htmlFor="preserve-history" className="text-sm">
                Add to tab history (enables undo/redo for dataset loading)
              </Label>
            </div>
          )}

          {/* Dataset Info */}
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="text-sm">
              <div className="font-medium mb-1">Dataset Information</div>
              <div className="space-y-1 text-muted-foreground">
                <div>Messages: {dataset.messages.length}</div>
                <div>Model: {dataset.model || 'Not specified'}</div>
                <div>System Prompt: {dataset.systemPrompt ? 'Yes' : 'No'}</div>
                {dataset.tags && dataset.tags.length > 0 && (
                  <div>Tags: {dataset.tags.join(', ')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Load to Playground
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Integration with DatasetNav
```typescript
// Update src/components/dataset-nav/DatasetNav.tsx

const DatasetNav = () => {
  const { datasets, deleteDataset } = useLocalDatasets();
  const loadDatasetToNewTab = usePlaygroundStore((state) => state.loadDatasetToNewTab);
  
  // ... existing state ...
  const [loadingDataset, setLoadingDataset] = useState<DatasetItem | null>(null);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  const handleLoadDataset = (dataset: DatasetItem) => {
    setLoadingDataset(dataset);
    setShowLoadDialog(true);
  };

  const handleConfirmLoad = async (dataset: DatasetItem, options: LoadDatasetOptions) => {
    try {
      const tabId = loadDatasetToNewTab(dataset, options);
      
      toast({
        title: "Dataset loaded",
        description: `"${dataset.name}" has been loaded to a new playground tab.`,
        action: (
          <ToastAction 
            altText="Go to tab"
            onClick={() => {
              // Navigate to playground if not already there
              // This depends on your routing setup
              window.location.href = '/playground';
            }}
          >
            Go to Tab
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: "Failed to load dataset",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  // ... rest of component ...

  return (
    <>
      {/* Existing DatasetNav content */}
      <SidebarGroup>
        {/* ... existing content ... */}
      </SidebarGroup>

      {/* Load Dataset Dialog */}
      <LoadDatasetDialog
        dataset={loadingDataset}
        open={showLoadDialog}
        onOpenChange={setShowLoadDialog}
        onConfirm={handleConfirmLoad}
      />
    </>
  );
};
```

### 4. DatasetItem Integration
```typescript
// Update src/components/dataset-nav/DatasetItem.tsx

export function DatasetItem({ 
  dataset, 
  onView, 
  onLoad, 
  onExport, 
  onDelete 
}: DatasetItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        className="group/item"
        onClick={() => onLoad?.(dataset)} // Quick load on click
      >
        <FileText className="h-4 w-4" />
        <div className="flex-1 truncate">
          <div className="truncate font-medium">{dataset.name}</div>
          <div className="text-xs text-muted-foreground">
            {dataset.messages.length} messages • {formatDate(dataset.createdAt)}
          </div>
        </div>
      </SidebarMenuButton>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction>
            <MoreHorizontal className="h-4 w-4" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onLoad?.(dataset)}>
            <Play className="h-4 w-4" />
            Load to Playground
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onView?.(dataset)}>
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport?.(dataset)}>
            <Download className="h-4 w-4" />
            Export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete?.(dataset)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
```

## Advanced Features

### 5. Dataset Tab Metadata
```typescript
// Extend IPlaygroundTabState to include dataset metadata
export interface IPlaygroundTabState {
  // ... existing properties ...
  
  // Dataset metadata (optional)
  datasetId?: string;
  datasetName?: string;
  loadedAt?: string;
  loadMode?: 'continue' | 'template';
}
```

### 6. Quick Load Actions
```typescript
// Add keyboard shortcut for quick load (Enter key)
const handleKeyDown = (e: KeyboardEvent, dataset: DatasetItem) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    // Quick load with default options
    const options: LoadDatasetOptions = {
      mode: 'continue',
      preserveHistory: true,
    };
    handleConfirmLoad(dataset, options);
  }
};
```

### 7. Loading State Management
```typescript
// Add loading states to DatasetNav
const [loadingDatasetId, setLoadingDatasetId] = useState<string | null>(null);

const handleConfirmLoad = async (dataset: DatasetItem, options: LoadDatasetOptions) => {
  setLoadingDatasetId(dataset.id);
  try {
    // ... loading logic ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setLoadingDatasetId(null);
  }
};

// Show loading state in DatasetItem
<SidebarMenuButton 
  className="group/item"
  disabled={loadingDatasetId === dataset.id}
  onClick={() => onLoad?.(dataset)}
>
  {loadingDatasetId === dataset.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <FileText className="h-4 w-4" />
  )}
  {/* ... rest of content ... */}
</SidebarMenuButton>
```

## Error Handling

### Edge Cases
- **Large datasets**: Handle datasets with many messages gracefully
- **Invalid data**: Validate dataset structure before loading
- **Storage issues**: Handle cases where playground store fails
- **Navigation issues**: Handle routing edge cases

### Validation
```typescript
const validateDatasetForLoading = (dataset: DatasetItem): string | null => {
  if (!dataset.messages || !Array.isArray(dataset.messages)) {
    return "Dataset contains invalid message data";
  }
  
  if (dataset.messages.length > 1000) {
    return "Dataset is too large (>1000 messages). Consider splitting it.";
  }
  
  // Validate message structure
  for (const message of dataset.messages) {
    if (!message.role || !message.parts) {
      return "Dataset contains malformed messages";
    }
  }
  
  return null; // Valid
};

const handleConfirmLoad = async (dataset: DatasetItem, options: LoadDatasetOptions) => {
  // Validate before loading
  const validationError = validateDatasetForLoading(dataset);
  if (validationError) {
    toast({
      title: "Cannot load dataset",
      description: validationError,
      variant: "destructive",
    });
    return;
  }
  
  // ... rest of loading logic ...
};
```

## Dependencies
- **TICKET_001** (Core Dataset Store) - Required for dataset data
- **TICKET_004** (Dataset Navigation Component) - Required for integration
- Existing playground store and tab management

## Testing Requirements
- Test loading datasets in both continue and template modes
- Test custom tab naming
- Test error handling for invalid datasets
- Test large dataset handling
- Test keyboard shortcuts and quick actions
- Test loading state management
- Test navigation after loading dataset
- Test history preservation options

## Estimated Effort
**6 hours**

## Definition of Done
- [ ] loadDatasetToNewTab method added to playground store
- [ ] LoadDatasetDialog component works correctly
- [ ] Dataset loading integrated with DatasetNav
- [ ] Both continue and template modes work
- [ ] Custom tab naming works
- [ ] Loading states display correctly
- [ ] Error handling covers edge cases
- [ ] Quick load functionality works
- [ ] Success feedback with navigation option works
- [ ] Keyboard shortcuts implemented
- [ ] Dataset validation before loading works 