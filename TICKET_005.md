# TICKET_005: Integrate Dataset Nav into Sidebar

## Summary
Integrate the DatasetNav component into the main application sidebar, positioning it appropriately within the existing navigation structure.

## Acceptance Criteria
- [ ] Add DatasetNav to AppSidebar component
- [ ] Position Datasets section logically within sidebar hierarchy
- [ ] Maintain existing sidebar functionality and styling
- [ ] Ensure proper collapsible behavior
- [ ] Handle responsive sidebar behavior
- [ ] Update sidebar layout for new section

## Technical Requirements

### Files to Modify
- `src/components/AppSidebar.tsx`

### Integration Point
Position the Datasets section between existing sections and Playground:
```
- APIs (ApiNav)
- My MCPs (McpNav) 
- External MCPs (ExternalMcpNav)
- **Datasets (DatasetNav)** ← New section
- Playground
```

## Implementation Details

### Import DatasetNav
```typescript
// Add to existing imports in AppSidebar.tsx
import { DatasetNav } from "@/components/dataset-nav";
```

### Sidebar Integration
```typescript
export function AppSidebar() {
  const location = useLocation();

  return (
    <>
      <Sidebar className="top-[var(--header-height)] !h-[calc(100svh-var(--header-height))]">
        <SidebarHeader className="border-b">
          {/* Existing header content */}
        </SidebarHeader>
        <SidebarContent>
          <ApiNav />
          <McpNav />
          <ExternalMcpNav />
          
          {/* Add DatasetNav here */}
          <DatasetNav />
          
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <Link to="/playground">
                  <SidebarMenuButton
                    isActive={location.pathname === "/playground"}
                  >
                    <SquareTerminal className="h-4 w-4" /> Playground
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {/* Existing footer content */}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
```

## Layout Considerations

### Sidebar Overflow Handling
With the addition of another section, ensure the sidebar can handle content overflow:

```typescript
<SidebarContent className="flex flex-col overflow-hidden">
  <div className="flex-1 overflow-y-auto">
    <ApiNav />
    <McpNav />
    <ExternalMcpNav />
    <DatasetNav />
  </div>
  
  {/* Fixed position playground link */}
  <div className="border-t">
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <Link to="/playground">
            <SidebarMenuButton
              isActive={location.pathname === "/playground"}
            >
              <SquareTerminal className="h-4 w-4" /> Playground
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </div>
</SidebarContent>
```

### Responsive Behavior
Ensure the DatasetNav section behaves correctly on different screen sizes:
- Mobile: Collapsible with other sections
- Desktop: Always visible if sidebar is open
- Tablet: Follows existing responsive patterns

## Visual Integration

### Spacing and Borders
Maintain consistent spacing between sidebar sections:
```typescript
// DatasetNav should have consistent spacing with other nav components
<DatasetNav className="border-b" />
```

### Section Hierarchy
The visual hierarchy should be:
1. **Local Workspace** (header)
2. **APIs** (primary content)
3. **My MCPs** (primary content) 
4. **External MCPs** (primary content)
5. **Datasets** (secondary content)
6. **Playground** (action/tool)

### Collapsible States
Ensure DatasetNav follows the same collapsible patterns as other nav components:
- Can expand/collapse independently
- Maintains state across app sessions
- Smooth transitions

## Error Handling

### Loading States
Handle loading states gracefully:
```typescript
<SidebarContent>
  <ApiNav />
  <McpNav />
  <ExternalMcpNav />
  
  <ErrorBoundary fallback={<DatasetNavErrorState />}>
    <Suspense fallback={<DatasetNavSkeleton />}>
      <DatasetNav />
    </Suspense>
  </ErrorBoundary>
  
  {/* Playground section */}
</SidebarContent>
```

### Error Boundaries
Ensure errors in DatasetNav don't break the entire sidebar:
```typescript
const DatasetNavErrorState = () => (
  <SidebarGroup>
    <SidebarGroupLabel>
      <Database className="h-4 w-4" />
      Datasets
    </SidebarGroupLabel>
    <SidebarGroupContent>
      <div className="p-2 text-xs text-muted-foreground">
        Failed to load datasets
      </div>
    </SidebarGroupContent>
  </SidebarGroup>
);
```

## Performance Considerations

### Lazy Loading
Consider making DatasetNav lazy-loaded to improve initial sidebar render:
```typescript
const DatasetNav = React.lazy(() => import("@/components/dataset-nav"));
```

### Memory Management
Ensure the sidebar doesn't hold unnecessary references to dataset data:
- Use selective subscriptions to dataset store
- Implement proper cleanup in useEffect hooks
- Avoid memory leaks in event listeners

## State Management

### Sidebar State Persistence
Ensure DatasetNav section state persists:
- Expanded/collapsed state
- Search query (optional)
- Last selected dataset (optional)

### Integration with Existing State
Don't interfere with existing sidebar state management:
- Preserve current tab selection
- Maintain existing nav component states
- Keep existing responsive behavior

## Testing Requirements

### Integration Tests
- Test sidebar renders with DatasetNav included
- Test sidebar overflow behavior with many items
- Test responsive behavior across screen sizes
- Test error states don't break sidebar

### Visual Tests
- Test consistent spacing with other nav components
- Test collapsible behavior works correctly
- Test loading states display properly
- Test error states display gracefully

### Accessibility Tests
- Test keyboard navigation through all sidebar sections
- Test screen reader announces new section correctly
- Test focus management when navigating between sections
- Test ARIA labels and structure are correct

## Dependencies
- **TICKET_004** (Dataset Navigation Component) - Required component
- Existing sidebar components and utilities
- Existing responsive behavior patterns

## Edge Cases
- Handle case where DatasetNav fails to load
- Handle case where dataset store is unavailable
- Handle case where localStorage is disabled
- Handle case where sidebar becomes too tall for viewport

## Estimated Effort
**2 hours**

## Definition of Done
- [ ] DatasetNav integrated into AppSidebar
- [ ] Sidebar layout accommodates new section properly
- [ ] Responsive behavior works correctly
- [ ] Visual consistency maintained with existing sections
- [ ] Error handling prevents sidebar breakage
- [ ] Loading states work correctly
- [ ] Accessibility is maintained
- [ ] Performance impact is acceptable
- [ ] All existing sidebar functionality still works
- [ ] Component loads and displays datasets correctly 