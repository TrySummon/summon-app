# TICKET_008: Error Handling and Data Validation

## Summary
Implement comprehensive error handling, data validation, and edge case management across all dataset functionality to ensure robust and reliable operation.

## Acceptance Criteria
- [ ] Add comprehensive data validation for all dataset operations
- [ ] Implement graceful error recovery mechanisms
- [ ] Handle localStorage quota and browser storage limits
- [ ] Add data migration for future schema changes
- [ ] Implement data corruption detection and recovery
- [ ] Add monitoring and debugging capabilities
- [ ] Handle network and system-level errors

## Technical Requirements

### Files to Create
- `src/utils/datasetValidation.ts`
- `src/utils/datasetMigration.ts`
- `src/utils/storageUtils.ts`
- `src/utils/errorHandler.ts`
- `src/components/dataset-nav/DatasetErrorBoundary.tsx`

### Files to Modify
- `src/stores/datasetStore.ts`
- `src/hooks/useLocalDatasets.ts`
- All dataset components for error handling integration

## Implementation Overview

This ticket focuses on making the dataset system robust and production-ready by adding comprehensive error handling, validation, and recovery mechanisms.

## Dependencies
- All previous tickets (TICKET_001 through TICKET_007)
- Enhanced error handling requires integration across all components

## Estimated Effort
**8 hours**

## Definition of Done
- [ ] Comprehensive data validation implemented
- [ ] Storage quota management working
- [ ] Data migration system implemented
- [ ] Error boundaries protect all components
- [ ] Error reporting and logging working
- [ ] Storage cleanup utilities working
- [ ] All error cases handled gracefully

## Core Validation System

### 1. Data Validation Utilities
```typescript
// src/utils/datasetValidation.ts
import { UIMessage } from "ai";
import { DatasetItem, LLMSettings } from "@/types/dataset";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// Dataset validation
export const validateDataset = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic structure validation
  if (!data || typeof data !== 'object') {
    errors.push({
      code: 'INVALID_STRUCTURE',
      message: 'Dataset must be a valid object',
      severity: 'error',
    });
    return { isValid: false, errors, warnings };
  }

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push({
      code: 'INVALID_NAME',
      message: 'Dataset name is required and must be a string',
      field: 'name',
      severity: 'error',
    });
  } else if (data.name.length < 1 || data.name.length > 100) {
    errors.push({
      code: 'INVALID_NAME_LENGTH',
      message: 'Dataset name must be between 1 and 100 characters',
      field: 'name',
      severity: 'error',
    });
  }

  // Messages validation
  if (!Array.isArray(data.messages)) {
    errors.push({
      code: 'INVALID_MESSAGES',
      message: 'Messages must be an array',
      field: 'messages',
      severity: 'error',
    });
  } else {
    const messageValidation = validateMessages(data.messages);
    errors.push(...messageValidation.errors);
    warnings.push(...messageValidation.warnings);
  }

  // Settings validation
  if (data.settings && !validateSettings(data.settings)) {
    warnings.push({
      code: 'INVALID_SETTINGS',
      message: 'Some settings are invalid and will be reset to defaults',
      field: 'settings',
    });
  }

  // Tags validation
  if (data.tags && (!Array.isArray(data.tags) || data.tags.length > 10)) {
    warnings.push({
      code: 'INVALID_TAGS',
      message: 'Tags must be an array with maximum 10 items',
      field: 'tags',
    });
  }

  // Size warnings
  const estimatedSize = JSON.stringify(data).length;
  if (estimatedSize > 5 * 1024 * 1024) { // 5MB
    warnings.push({
      code: 'LARGE_DATASET',
      message: 'Dataset is very large and may impact performance',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// Message validation
export const validateMessages = (messages: any[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  messages.forEach((message, index) => {
    if (!isValidMessage(message)) {
      errors.push({
        code: 'INVALID_MESSAGE',
        message: `Message at index ${index} is invalid`,
        field: `messages[${index}]`,
        severity: 'error',
      });
    }
  });

  if (messages.length > 1000) {
    warnings.push({
      code: 'TOO_MANY_MESSAGES',
      message: 'Dataset contains over 1000 messages, which may impact performance',
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
};

export const isValidMessage = (message: any): message is UIMessage => {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.role === 'string' &&
    ['user', 'assistant', 'system', 'tool'].includes(message.role) &&
    Array.isArray(message.parts) &&
    message.parts.length > 0 &&
    message.parts.every(isValidMessagePart)
  );
};

const isValidMessagePart = (part: any): boolean => {
  if (!part || typeof part !== 'object' || !part.type) {
    return false;
  }

  switch (part.type) {
    case 'text':
      return typeof part.text === 'string';
    case 'tool-invocation':
      return part.toolInvocation && 
             typeof part.toolInvocation.toolName === 'string';
    case 'tool-result':
      return part.toolResult && 
             typeof part.toolResult.toolCallId === 'string';
    default:
      return false;
  }
};

export const validateSettings = (settings: any): settings is LLMSettings => {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Check numeric values are in valid ranges
  if (settings.temperature !== undefined) {
    if (typeof settings.temperature !== 'number' || 
        settings.temperature < 0 || 
        settings.temperature > 2) {
      return false;
    }
  }

  if (settings.maxTokens !== undefined) {
    if (typeof settings.maxTokens !== 'number' || 
        settings.maxTokens < 1 || 
        settings.maxTokens > 100000) {
      return false;
    }
  }

  return true;
};

// Schema version validation for migrations
export const validateSchemaVersion = (data: any): string | null => {
  if (!data.version) {
    return 'legacy'; // No version = legacy format
  }
  
  if (typeof data.version !== 'string') {
    return null; // Invalid version format
  }
  
  return data.version;
};
```

### 2. Storage Utilities and Quota Management
```typescript
// src/utils/storageUtils.ts
export interface StorageInfo {
  used: number;
  available: number;
  total: number;
  percentage: number;
}

export class StorageManager {
  private static readonly STORAGE_KEY_PREFIX = 'local-datasets';
  private static readonly WARNING_THRESHOLD = 0.8; // 80%
  private static readonly CRITICAL_THRESHOLD = 0.95; // 95%

  static async getStorageInfo(): Promise<StorageInfo> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const available = total - used;
        const percentage = total > 0 ? used / total : 0;

        return { used, available, total, percentage };
      } catch (error) {
        console.warn('Storage estimation not available:', error);
      }
    }

    // Fallback: estimate based on localStorage
    return this.estimateLocalStorageUsage();
  }

  private static estimateLocalStorageUsage(): StorageInfo {
    let used = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          used += key.length + value.length;
        }
      }
    } catch (error) {
      console.warn('Cannot estimate localStorage usage:', error);
    }

    // Assume 5MB total for localStorage (common limit)
    const total = 5 * 1024 * 1024;
    const available = total - used;
    const percentage = used / total;

    return { used, available, total, percentage };
  }

  static async checkStorageSpace(requiredSpace: number): Promise<{
    hasSpace: boolean;
    info: StorageInfo;
    recommendation?: string;
  }> {
    const info = await this.getStorageInfo();
    const hasSpace = info.available >= requiredSpace;

    let recommendation: string | undefined;
    if (!hasSpace) {
      recommendation = 'Delete some datasets to free up space';
    } else if (info.percentage > this.CRITICAL_THRESHOLD) {
      recommendation = 'Storage is almost full. Consider cleaning up datasets';
    } else if (info.percentage > this.WARNING_THRESHOLD) {
      recommendation = 'Storage is getting full. Monitor usage';
    }

    return { hasSpace, info, recommendation };
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async cleanupCorruptedData(): Promise<number> {
    let cleanedCount = 0;
    const keysToRemove: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              JSON.parse(value); // Test if it's valid JSON
            }
          } catch (error) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleanedCount++;
      });
    } catch (error) {
      console.error('Failed to cleanup corrupted data:', error);
    }

    return cleanedCount;
  }
}

export const handleStorageError = (error: Error, operation: string) => {
  let message = `Failed to ${operation}`;
  let action: string | undefined;

  if (error.name === 'QuotaExceededError') {
    message = 'Storage limit exceeded';
    action = 'Please delete some datasets to free up space';
  } else if (error.message.includes('corrupt')) {
    message = 'Data corruption detected';
    action = 'Try refreshing the page or contact support';
  }

  return { message, action };
};
```

### 3. Data Migration System
```typescript
// src/utils/datasetMigration.ts
export interface MigrationContext {
  version: string;
  data: any;
  logger?: (message: string) => void;
}

export interface Migration {
  version: string;
  description: string;
  migrate: (context: MigrationContext) => any;
}

const migrations: Migration[] = [
  {
    version: '1.0',
    description: 'Initial schema',
    migrate: (context) => context.data,
  },
  {
    version: '1.1',
    description: 'Add tags and description fields',
    migrate: (context) => {
      const { data } = context;
      return {
        ...data,
        tags: data.tags || [],
        description: data.description || '',
      };
    },
  },
  // Add future migrations here
];

export class DatasetMigrator {
  static readonly CURRENT_VERSION = '1.1';

  static needsMigration(data: any): boolean {
    const version = data.version || 'legacy';
    return version !== this.CURRENT_VERSION;
  }

  static migrate(data: any, logger?: (message: string) => void): any {
    const startVersion = data.version || 'legacy';
    logger?.(`Starting migration from version ${startVersion}`);

    let currentData = { ...data };
    const startIndex = startVersion === 'legacy' ? 0 : 
      migrations.findIndex(m => m.version === startVersion) + 1;

    for (let i = startIndex; i < migrations.length; i++) {
      const migration = migrations[i];
      logger?.(`Applying migration: ${migration.description}`);
      
      try {
        currentData = migration.migrate({
          version: migration.version,
          data: currentData,
          logger,
        });
        currentData.version = migration.version;
      } catch (error) {
        logger?.(`Migration failed: ${error.message}`);
        throw new Error(`Migration to ${migration.version} failed: ${error.message}`);
      }
    }

    logger?.(`Migration completed to version ${this.CURRENT_VERSION}`);
    return currentData;
  }

  static canMigrate(data: any): boolean {
    try {
      // Test if migration would succeed without actually doing it
      this.migrate(data);
      return true;
    } catch {
      return false;
    }
  }
}
```

### 4. Error Boundary Component
```typescript
// src/components/dataset-nav/DatasetErrorBoundary.tsx
interface DatasetErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class DatasetErrorBoundary extends React.Component<
  DatasetErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: DatasetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dataset Error Boundary caught an error:', error, errorInfo);
    
    // Log to error reporting service if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          component: 'DatasetNav',
        },
      });
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          reset={this.reset} 
        />
      );
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error: Error; reset: () => void }> = ({ 
  error, 
  reset 
}) => (
  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
    <div className="flex items-center gap-2 text-red-800 mb-2">
      <AlertTriangle className="h-4 w-4" />
      <span className="font-medium">Dataset Error</span>
    </div>
    <p className="text-sm text-red-700 mb-3">
      {error.message || 'An unexpected error occurred in the dataset section.'}
    </p>
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={reset}>
        Try Again
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        onClick={() => {
          // Clear localStorage datasets and reset
          localStorage.removeItem('local-datasets');
          reset();
        }}
      >
        Reset Datasets
      </Button>
    </div>
  </div>
);
```

### 5. Enhanced Store Error Handling
```typescript
// Updates to src/stores/datasetStore.ts

import { validateDataset, ValidationResult } from "@/utils/datasetValidation";
import { StorageManager, handleStorageError } from "@/utils/storageUtils";
import { DatasetMigrator } from "@/utils/datasetMigration";

// Add to store interface
export interface LocalDatasetStore {
  // ... existing methods ...
  
  // Error handling
  lastError: string | null;
  clearError: () => void;
  validateDataset: (dataset: Partial<DatasetItem>) => ValidationResult;
  
  // Storage management
  getStorageInfo: () => Promise<StorageInfo>;
  cleanupStorage: () => Promise<number>;
}

// Enhanced addDataset with validation
addDataset: (dataset: Omit<DatasetItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    // Clear previous errors
    set({ lastError: null });

    // Validate dataset
    const validation = validateDataset(dataset);
    if (!validation.isValid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ');
      set({ lastError: errorMessage });
      throw new Error(errorMessage);
    }

    // Check storage space
    const dataSize = JSON.stringify(dataset).length;
    return StorageManager.checkStorageSpace(dataSize).then(({ hasSpace, recommendation }) => {
      if (!hasSpace) {
        const error = 'Insufficient storage space';
        set({ lastError: error });
        throw new Error(`${error}. ${recommendation}`);
      }

      // Create dataset with validation
      const now = new Date().toISOString();
      const newDataset: DatasetItem = {
        ...dataset,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        // Ensure data integrity
        messages: dataset.messages.filter(msg => isValidMessage(msg)),
        tags: dataset.tags?.slice(0, 10), // Limit tags
        name: dataset.name.slice(0, 100), // Limit name length
      };

      // Add to store
      set((state) => ({
        datasets: {
          ...state.datasets,
          [newDataset.id]: newDataset,
        },
      }));

      return newDataset.id;
    });
  } catch (error) {
    const { message } = handleStorageError(error, 'save dataset');
    set({ lastError: message });
    throw error;
  }
},

// Enhanced data loading with migration
// Modify the persist middleware onRehydrateStorage
const persistOptions: PersistOptions<LocalDatasetStore, LocalDatasetStore> = {
  name: "local-datasets",
  storage: createJSONStorage(() => localStorage),
  onRehydrateStorage: () => (state) => {
    if (state?.datasets) {
      // Migrate datasets if needed
      const migratedDatasets: Record<string, DatasetItem> = {};
      let migrationCount = 0;

      Object.entries(state.datasets).forEach(([id, dataset]) => {
        try {
          if (DatasetMigrator.needsMigration(dataset)) {
            migratedDatasets[id] = DatasetMigrator.migrate(dataset);
            migrationCount++;
          } else {
            migratedDatasets[id] = dataset;
          }
        } catch (error) {
          console.error(`Failed to migrate dataset ${id}:`, error);
          // Skip corrupted datasets
        }
      });

      if (migrationCount > 0) {
        console.log(`Migrated ${migrationCount} datasets`);
        set({ datasets: migratedDatasets });
      }
    }
  },
};
```

## Integration with Components

### 6. Component Error Handling
```typescript
// Add to all dataset components
const handleError = (error: Error, operation: string) => {
  console.error(`Dataset ${operation} error:`, error);
  
  const { message, action } = handleStorageError(error, operation);
  
  toast({
    title: "Operation Failed",
    description: message,
    variant: "destructive",
    action: action ? (
      <ToastAction altText={action}>
        {action}
      </ToastAction>
    ) : undefined,
  });
};
```

### 7. Monitoring and Debugging
```typescript
// src/utils/errorHandler.ts
export class DatasetErrorReporter {
  private static errors: Array<{
    timestamp: string;
    operation: string;
    error: string;
    context?: any;
  }> = [];

  static reportError(operation: string, error: Error, context?: any) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      context,
    };

    this.errors.push(errorEntry);
    
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }

    console.error(`Dataset Error [${operation}]:`, error, context);
  }

  static getErrorHistory() {
    return [...this.errors];
  }

  static clearErrorHistory() {
    this.errors = [];
  }

  static exportErrorLog() {
    const log = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(log, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

## Testing Requirements
- Test validation with various invalid dataset structures
- Test storage quota handling
- Test data migration scenarios
- Test error recovery mechanisms
- Test error boundary fallbacks
- Test storage cleanup functionality
- Test data corruption detection

## Estimated Effort
**8 hours**

## Definition of Done
- [ ] Comprehensive data validation implemented
- [ ] Storage quota management working
- [ ] Data migration system implemented
- [ ] Error boundaries protect all components
- [ ] Error reporting and logging working
- [ ] Storage cleanup utilities working
- [ ] All error cases handled gracefully
- [ ] Migration system tested with sample data
- [ ] Debug and monitoring tools available 