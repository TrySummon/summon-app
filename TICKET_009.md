# TICKET_009: Performance Optimizations and Polish

## Summary
Implement performance optimizations, UI polish, and final enhancements to ensure a smooth and efficient user experience with the dataset management system.

## Acceptance Criteria
- [ ] Optimize dataset list rendering for large collections
- [ ] Implement virtual scrolling for datasets >50 items
- [ ] Add search result highlighting and advanced filtering
- [ ] Optimize data serialization and storage compression
- [ ] Add keyboard navigation and accessibility improvements
- [ ] Implement UI animations and loading states
- [ ] Add user onboarding and help documentation
- [ ] Performance monitoring and metrics

## Technical Requirements

### Files to Create
- `src/components/dataset-nav/VirtualizedDatasetList.tsx`
- `src/components/dataset-nav/DatasetSearch.tsx`
- `src/components/dataset-nav/OnboardingTour.tsx`
- `src/hooks/useDatasetMetrics.ts`
- `src/utils/compressionUtils.ts`

### Files to Modify
- `src/components/dataset-nav/DatasetNav.tsx`
- `src/components/dataset-nav/DatasetItem.tsx`
- `src/stores/datasetStore.ts`

## Performance Optimizations

### 1. Virtual Scrolling Implementation
```typescript
// src/components/dataset-nav/VirtualizedDatasetList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualizedDatasetListProps {
  datasets: DatasetItem[];
  height: number;
  onDatasetAction: (action: string, dataset: DatasetItem) => void;
}

const ITEM_HEIGHT = 72; // Height of each dataset item

export function VirtualizedDatasetList({ 
  datasets, 
  height, 
  onDatasetAction 
}: VirtualizedDatasetListProps) {
  const Row = useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const dataset = datasets[index];
    
    return (
      <div style={style}>
        <DatasetItem
          dataset={dataset}
          onView={() => onDatasetAction('view', dataset)}
          onLoad={() => onDatasetAction('load', dataset)}
          onExport={() => onDatasetAction('export', dataset)}
          onDelete={() => onDatasetAction('delete', dataset)}
        />
      </div>
    );
  }, [datasets, onDatasetAction]);

  return (
    <List
      height={height}
      itemCount={datasets.length}
      itemSize={ITEM_HEIGHT}
      overscanCount={5}
    >
      {Row}
    </List>
  );
}

// Usage in DatasetNav
const DatasetNav = () => {
  const shouldUseVirtualization = datasets.length > 50;
  
  return (
    <SidebarGroup>
      {/* ... header content ... */}
      
      <SidebarGroupContent>
        {shouldUseVirtualization ? (
          <VirtualizedDatasetList
            datasets={filteredDatasets}
            height={400}
            onDatasetAction={handleDatasetAction}
          />
        ) : (
          <SidebarMenu>
            {filteredDatasets.map(dataset => (
              <DatasetItem key={dataset.id} dataset={dataset} {...handlers} />
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};
```

### 2. Advanced Search and Filtering
```typescript
// src/components/dataset-nav/DatasetSearch.tsx
interface DatasetSearchProps {
  datasets: DatasetItem[];
  onFilterChange: (filtered: DatasetItem[]) => void;
}

interface SearchFilters {
  query: string;
  tags: string[];
  dateRange: { start?: Date; end?: Date };
  messageCountRange: { min?: number; max?: number };
  sortBy: 'name' | 'createdAt' | 'messageCount' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

export function DatasetSearch({ datasets, onFilterChange }: DatasetSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    dateRange: {},
    messageCountRange: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced search with useMemo for performance
  const filteredDatasets = useMemo(() => {
    let results = [...datasets];

    // Text search with highlighting
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase();
      results = results.filter(dataset => 
        dataset.name.toLowerCase().includes(query) ||
        dataset.description?.toLowerCase().includes(query) ||
        dataset.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Tag filtering
    if (filters.tags.length > 0) {
      results = results.filter(dataset =>
        filters.tags.every(tag => dataset.tags?.includes(tag))
      );
    }

    // Date range filtering
    if (filters.dateRange.start || filters.dateRange.end) {
      results = results.filter(dataset => {
        const createdAt = new Date(dataset.createdAt);
        const afterStart = !filters.dateRange.start || 
          createdAt >= filters.dateRange.start;
        const beforeEnd = !filters.dateRange.end || 
          createdAt <= filters.dateRange.end;
        return afterStart && beforeEnd;
      });
    }

    // Message count filtering
    if (filters.messageCountRange.min || filters.messageCountRange.max) {
      results = results.filter(dataset => {
        const count = dataset.messages.length;
        const aboveMin = !filters.messageCountRange.min || 
          count >= filters.messageCountRange.min;
        const belowMax = !filters.messageCountRange.max || 
          count <= filters.messageCountRange.max;
        return aboveMin && belowMax;
      });
    }

    // Sorting
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - 
                      new Date(b.createdAt).getTime();
          break;
        case 'messageCount':
          comparison = a.messages.length - b.messages.length;
          break;
        case 'relevance':
          // Implement relevance scoring based on query match
          comparison = calculateRelevance(b, filters.query) - 
                      calculateRelevance(a, filters.query);
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  }, [datasets, filters]);

  useEffect(() => {
    onFilterChange(filteredDatasets);
  }, [filteredDatasets, onFilterChange]);

  return (
    <div className="space-y-2">
      {/* Basic search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search datasets..."
          value={filters.query}
          onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
          className="pl-8"
        />
      </div>

      {/* Advanced filters toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full justify-between"
      >
        Advanced Filters
        <ChevronDown className={`h-4 w-4 transition-transform ${
          showAdvanced ? 'rotate-180' : ''
        }`} />
      </Button>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="space-y-3 p-3 border rounded-lg">
          {/* Sort options */}
          <div className="flex gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, sortBy: value as any }))
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="messageCount">Message Count</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => 
                setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                }))
              }
            >
              {filters.sortOrder === 'asc' ? <ArrowUp /> : <ArrowDown />}
            </Button>
          </div>

          {/* Tag filtering */}
          <div>
            <Label className="text-xs">Filter by tags:</Label>
            <TagSelector
              availableTags={getAllTags(datasets)}
              selectedTags={filters.tags}
              onChange={(tags) => setFilters(prev => ({ ...prev, tags }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const calculateRelevance = (dataset: DatasetItem, query: string): number => {
  if (!query.trim()) return 0;
  
  const q = query.toLowerCase();
  let score = 0;
  
  // Name match (highest weight)
  if (dataset.name.toLowerCase().includes(q)) {
    score += 10;
    if (dataset.name.toLowerCase().startsWith(q)) score += 5;
  }
  
  // Description match
  if (dataset.description?.toLowerCase().includes(q)) score += 5;
  
  // Tag match
  if (dataset.tags?.some(tag => tag.toLowerCase().includes(q))) score += 3;
  
  return score;
};
```

### 3. Data Compression and Caching
```typescript
// src/utils/compressionUtils.ts
export class DatasetCompression {
  // Simple LZ-string based compression for localStorage
  static compress(data: any): string {
    const json = JSON.stringify(data);
    
    // Only compress if data is large enough to benefit
    if (json.length > 1000) {
      try {
        // Use browser's built-in compression if available
        if ('CompressionStream' in window) {
          return this.compressWithStreams(json);
        }
        
        // Fallback to simple compression
        return this.simpleCompress(json);
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
        return json;
      }
    }
    
    return json;
  }

  static decompress(compressed: string): any {
    try {
      // Try to parse as regular JSON first
      return JSON.parse(compressed);
    } catch {
      try {
        // Try decompression
        const decompressed = this.simpleDecompress(compressed);
        return JSON.parse(decompressed);
      } catch (error) {
        console.error('Decompression failed:', error);
        throw new Error('Failed to decompress dataset data');
      }
    }
  }

  private static simpleCompress(str: string): string {
    // Simple run-length encoding for repeated patterns
    return str.replace(/(.)\1{2,}/g, (match, char) => {
      return `${char}*${match.length}`;
    });
  }

  private static simpleDecompress(str: string): string {
    return str.replace(/(.)\*(\d+)/g, (match, char, count) => {
      return char.repeat(parseInt(count));
    });
  }

  private static async compressWithStreams(str: string): Promise<string> {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    writer.write(new TextEncoder().encode(str));
    writer.close();
    
    const chunks: Uint8Array[] = [];
    let result = await reader.read();
    
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
    
    // Convert to base64 for storage
    const compressed = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    
    return btoa(String.fromCharCode(...compressed));
  }
}

// Cache management
export class DatasetCache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  static set(key: string, data: any): void {
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
    });
    
    // Clean up old entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  static clear(): void {
    this.cache.clear();
  }
}
```

### 4. UI Animations and Polish
```typescript
// Add to DatasetItem component
const DatasetItem = ({ dataset, ...props }: DatasetItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <SidebarMenuItem>
        <SidebarMenuButton className="group/item">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <FileText className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex-1 truncate">
            <motion.div 
              className="truncate font-medium"
              animate={{ color: isHovered ? '#2563eb' : 'inherit' }}
            >
              {dataset.name}
            </motion.div>
            <div className="text-xs text-muted-foreground">
              {dataset.messages.length} messages • {formatDate(dataset.createdAt)}
            </div>
          </div>
        </SidebarMenuButton>
        
        {/* Action buttons with stagger animation */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <DropdownMenu>
                {/* ... dropdown content ... */}
              </DropdownMenu>
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarMenuItem>
    </motion.div>
  );
};
```

### 5. Performance Monitoring
```typescript
// src/hooks/useDatasetMetrics.ts
export function useDatasetMetrics() {
  const [metrics, setMetrics] = useState({
    totalDatasets: 0,
    totalMessages: 0,
    storageUsed: 0,
    averageDatasetSize: 0,
    loadTime: 0,
    searchTime: 0,
  });

  const measureOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    metricName: keyof typeof metrics
  ): Promise<T> => {
    const start = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      setMetrics(prev => ({
        ...prev,
        [metricName]: duration,
      }));
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.warn(`Operation ${metricName} failed after ${duration}ms:`, error);
      throw error;
    }
  }, []);

  const updateStorageMetrics = useCallback(async () => {
    try {
      const storageInfo = await StorageManager.getStorageInfo();
      const datasets = Object.values(useDatasetStore.getState().datasets);
      
      const totalMessages = datasets.reduce(
        (sum, dataset) => sum + dataset.messages.length, 
        0
      );
      
      const averageSize = datasets.length > 0 
        ? storageInfo.used / datasets.length 
        : 0;

      setMetrics(prev => ({
        ...prev,
        totalDatasets: datasets.length,
        totalMessages,
        storageUsed: storageInfo.used,
        averageDatasetSize: averageSize,
      }));
    } catch (error) {
      console.warn('Failed to update storage metrics:', error);
    }
  }, []);

  return {
    metrics,
    measureOperation,
    updateStorageMetrics,
  };
}
```

### 6. Keyboard Navigation
```typescript
// Enhanced keyboard support in DatasetNav
const useKeyboardNavigation = (datasets: DatasetItem[]) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [focusedDataset, setFocusedDataset] = useState<DatasetItem | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!datasets.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < datasets.length - 1 ? prev + 1 : 0
          );
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : datasets.length - 1
          );
          break;
          
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault();
            setFocusedDataset(datasets[selectedIndex]);
          }
          break;
          
        case 'Escape':
          setSelectedIndex(-1);
          setFocusedDataset(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [datasets, selectedIndex]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < datasets.length) {
      setFocusedDataset(datasets[selectedIndex]);
    }
  }, [selectedIndex, datasets]);

  return {
    selectedIndex,
    focusedDataset,
    setSelectedIndex,
  };
};
```

## UI Polish Enhancements

### 7. Loading States and Skeletons
```typescript
const DatasetSkeleton = () => (
  <div className="space-y-2 p-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
```

## Dependencies
- All previous tickets (TICKET_001 through TICKET_008)
- React Window for virtualization
- Framer Motion for animations
- Performance monitoring APIs

## Testing Requirements
- Performance testing with large dataset collections
- Animation performance testing
- Keyboard navigation testing
- Search performance benchmarking
- Memory usage optimization verification

## Estimated Effort
**12 hours**

## Definition of Done
- [ ] Virtual scrolling implemented for large lists
- [ ] Advanced search and filtering working
- [ ] Data compression implemented
- [ ] UI animations and polish complete
- [ ] Keyboard navigation fully functional
- [ ] Performance metrics and monitoring active
- [ ] Loading states and skeletons implemented
- [ ] Accessibility compliance verified
- [ ] Performance benchmarks meet targets 