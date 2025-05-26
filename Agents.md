# Coding Best Practices for AI Agents

This document outlines the coding standards, patterns, and best practices for AI agents working on this Electron + React + TypeScript codebase. Following these guidelines ensures consistency, maintainability, and quality across the project.

## 🏗️ Project Architecture Overview

This is an **Electron application** built with:
- **Frontend**: React 19 + TypeScript 5.8 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Electron main process with Node.js
- **Build System**: Vite 6 + Electron Forge
- **State Management**: TanStack Query + TanStack Router
- **Testing**: Vitest + Playwright + React Testing Library
- **Code Quality**: ESLint 9 + Prettier + TypeScript strict mode

## 📁 Directory Structure & Organization

### Core Directories
```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (auto-generated)
│   ├── mcp-*/          # Feature-specific component groups
│   └── *.tsx           # Shared/global components
├── helpers/            # Utility functions and business logic
│   ├── ipc/           # Inter-process communication
│   ├── db/            # Database operations (file-based)
│   └── mcp/           # MCP-specific logic
├── hooks/             # Custom React hooks
├── pages/             # Page components
├── routes/            # TanStack Router configuration
├── styles/            # Global CSS and Tailwind styles
├── types/             # TypeScript type definitions
├── utils/             # Pure utility functions
└── tests/             # Test files
    ├── unit/          # Unit tests (Vitest)
    └── e2e/           # End-to-end tests (Playwright)
```

### File Naming Conventions
- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase starting with "use" (`useMyHook.ts`)
- **Utilities**: camelCase (`myUtility.ts`)
- **Types**: camelCase (`myTypes.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MY_CONSTANT`)

## 🎯 Component Development Guidelines

### 1. Component Structure Pattern
```typescript
import React from "react";
import { cn } from "@/utils/tailwind";

// Props interface with clear documentation
interface MyComponentProps {
  /** Brief description of the prop */
  title: string;
  /** Optional prop with default value */
  variant?: "default" | "secondary";
  /** Standard HTML attributes */
  className?: string;
  children?: React.ReactNode;
}

// Use React.forwardRef for components that need ref forwarding
const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
  ({ title, variant = "default", className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "base-styles",
          variant === "secondary" && "variant-styles",
          className
        )}
        {...props}
      >
        <h2>{title}</h2>
        {children}
      </div>
    );
  }
);

MyComponent.displayName = "MyComponent";

export { MyComponent };
export type { MyComponentProps };
```

### 2. shadcn/ui Integration
- **Always use the canary version**: `npx shadcn@canary add component-name`
- **Extend, don't modify**: Create wrapper components instead of modifying ui components
- **Use the `cn()` utility**: For conditional and merged class names
- **Follow the data-slot pattern**: Use `data-slot="component-name"` for styling hooks

### 3. Styling Guidelines
```typescript
// ✅ Good: Use cn() for conditional classes
className={cn(
  "base-class",
  isActive && "active-class",
  variant === "large" && "large-class",
  className
)}

// ✅ Good: Use Tailwind utilities
className="flex items-center justify-between p-4 rounded-lg"

// ❌ Avoid: Inline styles
style={{ padding: "16px", borderRadius: "8px" }}
```

## 🔄 IPC Communication Patterns

### 1. Channel Naming Convention
```typescript
// Pattern: FEATURE_ACTION_CHANNEL
export const THEME_MODE_TOGGLE_CHANNEL = "theme:toggle";
export const API_LIST_CHANNEL = "api:list";
export const MCP_CREATE_CHANNEL = "mcp:create";
```

### 2. Context Exposer Pattern
```typescript
// src/helpers/ipc/feature/feature-context.ts
export function exposeFeatureContext() {
  const { contextBridge, ipcRenderer } = window.require("electron");
  
  contextBridge.exposeInMainWorld("featureApi", {
    action: (data: ActionData) => ipcRenderer.invoke(ACTION_CHANNEL, data),
  });
}
```

### 3. Listener Registration Pattern
```typescript
// src/helpers/ipc/feature/feature-listeners.ts
export function addFeatureEventListeners() {
  ipcMain.handle(ACTION_CHANNEL, async (_, data: ActionData) => {
    try {
      const result = await performAction(data);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  });
}
```

### 4. Type-Safe IPC Responses
```typescript
// Always return consistent response format
interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// Use in both main and renderer processes
const response: IpcResponse<ApiData[]> = await window.openapi.db.listApis();
if (response.success && response.data) {
  // Handle success
} else {
  // Handle error with response.message
}
```

## 🗄️ Database & State Management

### 1. File-Based Database Pattern
```typescript
// Follow the established pattern in src/helpers/db/
export interface DataStructure {
  id: string;
  createdAt: string;
  updatedAt: string;
  // ... other fields
}

export const dataDb = {
  create: async (data: Omit<DataStructure, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Implementation
  },
  list: async (): Promise<DataStructure[]> => {
    // Implementation
  },
  getById: async (id: string): Promise<DataStructure | null> => {
    // Implementation
  },
  update: async (id: string, data: Partial<DataStructure>) => {
    // Implementation
  },
  delete: async (id: string): Promise<boolean> => {
    // Implementation
  }
};
```

### 2. TanStack Query Integration
```typescript
// src/hooks/useMyData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const MY_DATA_QUERY_KEY = 'myData';

export function useMyData() {
  return useQuery({
    queryKey: [MY_DATA_QUERY_KEY],
    queryFn: () => window.myApi.list(),
  });
}

export function useCreateMyData() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateDataInput) => window.myApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MY_DATA_QUERY_KEY] });
    },
  });
}
```

## 🧪 Testing Guidelines

### 1. Unit Testing with Vitest
```typescript
// src/tests/unit/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders with correct title', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<MyComponent title="Test" className="custom-class" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('custom-class');
  });
});
```

### 2. E2E Testing with Playwright
```typescript
// src/tests/e2e/feature.spec.ts
import { test, expect } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';

test.describe('Feature Tests', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    page = await electronApp.firstWindow();
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should perform feature action', async () => {
    // Test implementation
  });
});
```

## 🔧 Code Quality Standards

### 1. TypeScript Configuration
- **Strict mode enabled**: All TypeScript strict checks are enforced
- **No implicit any**: Always provide explicit types
- **Path aliases**: Use `@/` for src imports

```typescript
// ✅ Good: Explicit types
interface UserData {
  id: string;
  name: string;
  email?: string;
}

const user: UserData = { id: '1', name: 'John' };

// ❌ Avoid: Implicit any
const user = { id: '1', name: 'John' }; // any type
```

### 2. ESLint Rules
- **React Compiler**: Enabled for optimization
- **Prettier integration**: Automatic formatting
- **Import organization**: Group and sort imports

```typescript
// ✅ Good: Import organization
import React from "react";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { MyComponent } from "@/components/MyComponent";
import { useMyHook } from "@/hooks/useMyHook";
import { cn } from "@/utils/tailwind";
```

### 3. Error Handling Patterns
```typescript
// ✅ Good: Consistent error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    message: error instanceof Error ? error.message : 'Unknown error occurred' 
  };
}

// ✅ Good: Type-safe error boundaries
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
```

## 🚀 Performance Best Practices

### 1. React Optimization
- **React Compiler enabled**: Automatic optimization
- **Lazy loading**: Use `React.lazy()` for code splitting
- **Memoization**: Use `useMemo` and `useCallback` judiciously

```typescript
// ✅ Good: Lazy loading
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

// ✅ Good: Memoized expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

### 2. Bundle Optimization
- **Tree shaking**: Import only what you need
- **Dynamic imports**: For conditional features

```typescript
// ✅ Good: Specific imports
import { Button } from "@/components/ui/button";

// ❌ Avoid: Barrel imports for large libraries
import * as LucideIcons from "lucide-react";
```

## 🔒 Security Guidelines

### 1. Electron Security
- **Context isolation enabled**: Renderer process is isolated
- **Node integration disabled**: Use IPC for Node.js access
- **Preload scripts**: Expose only necessary APIs

### 2. Data Validation
```typescript
// ✅ Good: Use Zod for validation
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
});

type User = z.infer<typeof UserSchema>;
```

## 📝 Documentation Standards

### 1. Code Comments
```typescript
/**
 * Calculates the total price including tax
 * @param basePrice - The base price before tax
 * @param taxRate - The tax rate as a decimal (e.g., 0.1 for 10%)
 * @returns The total price including tax
 */
function calculateTotalPrice(basePrice: number, taxRate: number): number {
  return basePrice * (1 + taxRate);
}
```

### 2. Component Documentation
```typescript
/**
 * A reusable button component with multiple variants
 * 
 * @example
 * ```tsx
 * <Button variant="secondary" size="lg">
 *   Click me
 * </Button>
 * ```
 */
interface ButtonProps {
  /** The visual style variant */
  variant?: "default" | "secondary" | "destructive";
  /** The size of the button */
  size?: "sm" | "default" | "lg";
}
```

## 🔄 Git & Development Workflow

### 1. Commit Messages
Follow conventional commits:
```
feat: add new MCP server management
fix: resolve IPC communication timeout
docs: update API documentation
refactor: simplify component structure
test: add unit tests for auth helpers
```

### 2. Branch Naming
```
feature/mcp-server-management
bugfix/ipc-timeout-issue
refactor/component-structure
docs/api-documentation
```

## 🎯 Common Patterns & Anti-Patterns

### ✅ Do's
- Use the established IPC patterns for main-renderer communication
- Follow the component structure with proper TypeScript interfaces
- Use TanStack Query for server state management
- Implement proper error boundaries and error handling
- Use the `cn()` utility for conditional styling
- Follow the file-based database patterns for data persistence
- Write tests for critical functionality

### ❌ Don'ts
- Don't modify shadcn/ui components directly
- Don't use inline styles instead of Tailwind classes
- Don't bypass the IPC layer for main process access
- Don't ignore TypeScript errors or use `any` type
- Don't create components without proper prop interfaces
- Don't forget to handle loading and error states
- Don't skip error handling in async operations

## 🔧 Development Commands

```bash
# Development
npm run start              # Start development server
npm run lint              # Run ESLint
npm run format:write      # Format code with Prettier
npm run test              # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:all          # Run all tests

# Building
npm run package           # Package the application
npm run make              # Create distributables
```

## 📚 Key Dependencies & Their Usage

- **React 19**: Latest React with concurrent features
- **TypeScript 5.8**: Strict type checking
- **Tailwind CSS 4**: Utility-first styling
- **shadcn/ui**: Pre-built accessible components
- **TanStack Query**: Server state management
- **TanStack Router**: Type-safe routing
- **Electron Forge**: Build and packaging
- **Vitest**: Fast unit testing
- **Playwright**: E2E testing

---

By following these guidelines, AI agents can contribute effectively to this codebase while maintaining consistency, quality, and best practices. Always refer to existing code patterns when implementing new features, and don't hesitate to ask for clarification when patterns are unclear. 