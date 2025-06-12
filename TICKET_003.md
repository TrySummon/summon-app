# TICKET_003: Add "Add to Dataset" Button to Messages

## Summary
Add an "Add to Local Dataset" button to playground messages that triggers the save dataset dialog and captures the entire conversation.

## Acceptance Criteria
- [ ] Add new button to message action buttons group
- [ ] Button appears on hover with existing copy/rerun/delete buttons
- [ ] Clicking button opens SaveDatasetDialog with current conversation
- [ ] Button has appropriate icon, tooltip, and styling
- [ ] Integration works with SaveDatasetDialog from TICKET_002

## Technical Requirements

### Files to Modify
- `src/components/playground/Message/index.tsx`

### Button Specifications
- **Icon**: `Database` from lucide-react
- **Tooltip**: "Add conversation to local dataset"
- **Position**: In existing action buttons group (before or after copy button)
- **Visibility**: Same pattern as other buttons (`opacity-0 group-hover:opacity-100`)
- **Size**: Consistent with existing action buttons (`size="icon"`)

## Implementation Details

### Button Integration
```typescript
// Add to existing imports in Message/index.tsx
import { Database } from "lucide-react";
import { SaveDatasetDialog } from "../SaveDatasetDialog";

// Add state for dialog
const [showSaveDialog, setShowSaveDialog] = useState(false);

// Add button to existing action buttons group
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      className="text-muted-foreground"
      onClick={() => setShowSaveDialog(true)}
      variant="ghost"
      size="icon"
    >
      <Database size={14} />
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top">
    <p>Add conversation to local dataset</p>
  </TooltipContent>
</Tooltip>
```

### Dialog Integration
```typescript
// Add SaveDatasetDialog component
<SaveDatasetDialog
  open={showSaveDialog}
  onOpenChange={setShowSaveDialog}
  messages={allMessages}
  systemPrompt={systemPrompt}
  model={model}
  settings={settings}
  onSuccess={(datasetId) => {
    // Optional: Show success feedback or navigate
    console.log("Dataset saved with ID:", datasetId);
  }}
/>
```

### Data Collection Logic
Need to access complete conversation data, not just the single message:

```typescript
// Add to Message component props or get from store
const getCurrentConversationData = () => {
  const currentState = usePlaygroundStore((state) => state.getCurrentState());
  return {
    messages: currentState.messages,
    systemPrompt: currentState.systemPrompt,
    model: currentState.model,
    settings: currentState.settings,
  };
};
```

## UI/UX Considerations

### Button Placement Options
1. **Option A**: Place after Copy button, before Rerun button
2. **Option B**: Place at the end of the button group
3. **Recommended**: Option A for logical flow (Copy → Save → Rerun → Delete)

### Visual Consistency
- Use same hover states as existing buttons
- Maintain consistent spacing and sizing
- Follow existing color scheme (`text-muted-foreground`)
- Same transition timing for opacity changes

### User Experience
- Button should be discoverable but not intrusive
- Tooltip clearly explains what the action does
- Success feedback should be clear but not disruptive
- Dialog should pre-populate with sensible defaults

## State Management

### Component State
```typescript
// Add to existing Message component state
const [showSaveDialog, setShowSaveDialog] = useState(false);
```

### Store Integration
```typescript
// Access playground store for conversation data
const currentState = usePlaygroundStore((state) => state.getCurrentState());
const {
  messages,
  systemPrompt,
  model,
  settings
} = currentState;
```

## Error Handling
- Handle case where no messages exist (disable button)
- Handle case where store is not available
- Graceful fallback if dialog fails to open
- Error handling delegated to SaveDatasetDialog component

## Accessibility Requirements
- Button must be keyboard accessible
- Tooltip should be announced by screen readers
- Focus management when dialog opens/closes
- Proper ARIA labels for the button action

## Visual Requirements
- Database icon should be 14px to match other icons
- Button should have same hover/focus states as siblings
- Maintain visual hierarchy with other action buttons
- No layout shift when button appears/disappears

## Dependencies
- **TICKET_001** (Core Dataset Store) - For data structures
- **TICKET_002** (Save Dataset Dialog) - Required component
- Existing Message component and its action buttons pattern

## Testing Requirements
- Test button appears on message hover
- Test button click opens dialog with correct data
- Test button disabled state when no messages
- Test integration with SaveDatasetDialog
- Test accessibility with keyboard navigation
- Test visual consistency across different message types

## Edge Cases
- Empty conversation (no messages) - button disabled
- Very long conversations - ensure all data is captured
- Conversations with tool calls - ensure complete data transfer
- System prompt variations - handle undefined/empty cases

## Estimated Effort
**3 hours**

## Definition of Done
- [ ] Button added to message action buttons group
- [ ] Button appears/disappears on hover correctly
- [ ] Clicking button opens SaveDatasetDialog
- [ ] Dialog receives complete conversation data
- [ ] Button has proper tooltip and accessibility
- [ ] Visual styling matches existing buttons
- [ ] Error handling implemented
- [ ] Integration testing with SaveDatasetDialog works
- [ ] Button behavior tested across different message scenarios 