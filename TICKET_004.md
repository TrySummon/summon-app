# TICKET_004: Dataset Navigation Component

## Summary
Create a navigation component for displaying and managing local datasets in a collapsible sidebar section, following the existing nav component patterns.

## Acceptance Criteria
- [ ] Create DatasetNav component following existing nav patterns
- [ ] Display list of datasets with names and metadata
- [ ] Add action menu for each dataset (View, Load, Export, Delete)
- [ ] Implement search/filter functionality for datasets
- [ ] Show dataset count and storage usage indicators
- [ ] Handle empty state when no datasets exist

## Technical Requirements

### Files to Create
- `src/components/dataset-nav/DatasetNav.tsx`
- `src/components/dataset-nav/DatasetItem.tsx`
- `src/components/dataset-nav/DatasetDetailsDialog.tsx`
- `src/components/dataset-nav/index.ts`

### Component Structure
```typescript
// src/components/dataset-nav/DatasetNav.tsx
interface DatasetNavProps {
  className?: string;
}

export function DatasetNav({ className }: DatasetNavProps) {
  // Component implementation
}
```

## UI/UX Requirements

### Main Navigation Structure
```typescript
<SidebarGroup className={className}>
  <SidebarGroupLabel>
    <Database className="h-4 w-4" />
    Datasets
    <SidebarGroupAction asChild>
      <Button variant="ghost" size="sm">
        <Plus className="h-4 w-4" />
      </Button>
    </SidebarGroupAction>
  </SidebarGroupLabel>
  
  <SidebarGroupContent>
    {/* Search/Filter Section */}
    <div className="px-2 pb-2">
      <Input
        placeholder="Search datasets..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-8"
      />
    </div>
    
    {/* Dataset List */}
    <SidebarMenu>
      {filteredDatasets.map(dataset => (
        <DatasetItem key={dataset.id} dataset={dataset} />
      ))}
    </SidebarMenu>
    
    {/* Empty State */}
    {datasets.length === 0 && <EmptyState />}
    
    {/* Footer with count/usage info */}
    <div className="px-2 pt-2 text-xs text-muted-foreground">
      {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}
    </div>
  </SidebarGroupContent>
</SidebarGroup>
```

### DatasetItem Component
```typescript
// src/components/dataset-nav/DatasetItem.tsx
interface DatasetItemProps {
  dataset: DatasetItem;
  onView?: (dataset: DatasetItem) => void;
  onLoad?: (dataset: DatasetItem) => void;
  onExport?: (dataset: DatasetItem) => void;
  onDelete?: (dataset: DatasetItem) => void;
}

export function DatasetItem({ dataset, ...actions }: DatasetItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton className="group/item">
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
          <DropdownMenuItem onClick={() => onView?.(dataset)}>
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onLoad?.(dataset)}>
            <Play className="h-4 w-4" />
            Load to Playground
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

## Functionality Requirements

### Search/Filter Implementation
```typescript
const [searchQuery, setSearchQuery] = useState("");

const filteredDatasets = useMemo(() => {
  if (!searchQuery.trim()) return datasets;
  
  const query = searchQuery.toLowerCase();
  return datasets.filter(dataset => 
    dataset.name.toLowerCase().includes(query) ||
    dataset.description?.toLowerCase().includes(query) ||
    dataset.tags?.some(tag => tag.toLowerCase().includes(query))
  );
}, [datasets, searchQuery]);
```

### Action Handlers
```typescript
const handleViewDataset = (dataset: DatasetItem) => {
  setSelectedDataset(dataset);
  setShowDetailsDialog(true);
};

const handleLoadDataset = (dataset: DatasetItem) => {
  // This will be implemented in TICKET_007
  console.log("Load dataset:", dataset.id);
};

const handleExportDataset = (dataset: DatasetItem) => {
  // Export dataset as JSON file
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    dataset,
    metadata: {
      messageCount: dataset.messages.length,
    },
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${dataset.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
};

const handleDeleteDataset = (dataset: DatasetItem) => {
  // Show confirmation dialog
  if (confirm(`Are you sure you want to delete "${dataset.name}"?`)) {
    deleteDataset(dataset.id);
    toast({
      title: "Dataset deleted",
      description: `"${dataset.name}" has been removed.`,
    });
  }
};
```

### Empty State Component
```typescript
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-4 text-center">
    <Database className="h-8 w-8 text-muted-foreground mb-2" />
    <p className="text-sm text-muted-foreground mb-1">No datasets yet</p>
    <p className="text-xs text-muted-foreground">
      Save conversations to create your first dataset
    </p>
  </div>
);
```

## Details Dialog Component

### DatasetDetailsDialog Structure
```typescript
// src/components/dataset-nav/DatasetDetailsDialog.tsx
interface DatasetDetailsDialogProps {
  dataset: DatasetItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatasetDetailsDialog({ 
  dataset, 
  open, 
  onOpenChange 
}: DatasetDetailsDialogProps) {
  if (!dataset) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dataset.name}</DialogTitle>
          <DialogDescription>
            Dataset details and message preview
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created:</span> {formatDate(dataset.createdAt)}
            </div>
            <div>
              <span className="font-medium">Messages:</span> {dataset.messages.length}
            </div>
            <div>
              <span className="font-medium">Model:</span> {dataset.model || "None"}
            </div>
            <div>
              <span className="font-medium">System Prompt:</span> {dataset.systemPrompt ? "Yes" : "No"}
            </div>
          </div>
          
          {/* Tags */}
          {dataset.tags && dataset.tags.length > 0 && (
            <div>
              <span className="font-medium text-sm">Tags:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {dataset.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Description */}
          {dataset.description && (
            <div>
              <span className="font-medium text-sm">Description:</span>
              <p className="text-sm text-muted-foreground mt-1">
                {dataset.description}
              </p>
            </div>
          )}
          
          {/* Message Preview */}
          <div>
            <span className="font-medium text-sm">Messages:</span>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {dataset.messages.slice(0, 5).map((message, index) => (
                <div key={index} className="p-2 rounded border text-xs">
                  <div className="font-medium capitalize">{message.role}</div>
                  <div className="text-muted-foreground mt-1 line-clamp-2">
                    {getMessagePreview(message)}
                  </div>
                </div>
              ))}
              {dataset.messages.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  ... and {dataset.messages.length - 5} more messages
                </p>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Styling & Performance

### Visual Design
- Follow existing sidebar nav patterns (McpNav, ApiNav)
- Use consistent icons and spacing
- Responsive text truncation for long dataset names
- Subtle visual hierarchy for metadata

### Performance Optimizations
- Virtualize dataset list if >50 items
- Debounce search input (300ms)
- Memoize filtered results
- Lazy load dataset details

### State Management
```typescript
const DatasetNav = () => {
  const { datasets } = useLocalDatasets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Component logic
};
```

## Dependencies
- **TICKET_001** (Core Dataset Store) - Required for data access
- Existing UI components: SidebarGroup, SidebarMenu, DropdownMenu, Dialog
- Existing nav component patterns for consistency

## Testing Requirements
- Test dataset list rendering with various data states
- Test search/filter functionality
- Test action menu interactions
- Test details dialog display
- Test export functionality
- Test delete confirmation flow
- Test empty state display
- Test performance with large dataset lists

## Estimated Effort
**8 hours**

## Definition of Done
- [ ] DatasetNav component follows existing nav patterns
- [ ] Dataset list displays correctly with metadata
- [ ] Search/filter functionality works
- [ ] Action menus work for all actions except Load (TICKET_007)
- [ ] Details dialog shows complete dataset information
- [ ] Export functionality works correctly
- [ ] Delete functionality works with confirmation
- [ ] Empty state displays appropriately
- [ ] Performance optimizations implemented
- [ ] Component is properly typed and documented 