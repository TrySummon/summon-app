# PostHog Integration for Electron App

This document explains how PostHog has been integrated into your Electron app with careful consideration for common issues and best practices.

## Overview

PostHog has been integrated with the following safety measures:
- **Memory-only persistence** to avoid localStorage issues in Electron
- **Manual pageview tracking** to work properly with React Router
- **Error handling** to prevent crashes if PostHog fails
- **Environment variable safety** to handle missing configuration gracefully

## Files Added/Modified

### Core Integration Files
- `src/lib/posthog.ts` - Main PostHog configuration and initialization
- `src/hooks/usePostHog.ts` - React hook for safe PostHog usage
- `src/components/PostHogRouter.tsx` - Automatic page view tracking
- `src/App.tsx` - PostHog initialization and router integration

### Example Files
- `src/examples/PostHogUsage.tsx` - Usage examples and patterns

## Environment Variables

Make sure these variables are set in your `.env` file:

```env
VITE_PUBLIC_POSTHOG_KEY=your_posthog_project_key
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Key Safety Features

### 1. Electron-Specific Configuration
- **Memory persistence**: Avoids localStorage issues common in Electron
- **Disabled automatic pageviews**: Manual control for better accuracy
- **CSP-friendly settings**: Works with Content Security Policy restrictions

### 2. Error Handling
- All PostHog calls are wrapped in try-catch blocks
- Graceful degradation if PostHog fails to load
- Console warnings for debugging without breaking the app

### 3. Environment Safety
- Safe environment variable access that works in Electron
- Fallback handling for missing configuration
- Runtime checks before making PostHog calls

## Usage Examples

### Basic Event Tracking
```typescript
import { usePostHog } from '@/hooks/usePostHog';

const MyComponent = () => {
  const { captureEvent, isLoaded } = usePostHog();

  const handleClick = () => {
    captureEvent('button_clicked', {
      button_name: 'my_button',
      page: 'my_page'
    });
  };

  return (
    <button onClick={handleClick}>
      Track This Click
    </button>
  );
};
```

### User Identification
```typescript
const { identify } = usePostHog();

// When user logs in
identify('user123', {
  email: 'user@example.com',
  plan: 'premium'
});
```

### Manual Page View Tracking
```typescript
const { capturePageView } = usePostHog();

// Track a specific page view
capturePageView('/special-page', {
  page_title: 'Special Page',
  section: 'analytics'
});
```

## Automatic Features

### Page View Tracking
The `PostHogRouter` component automatically tracks page views when routes change. This is already integrated into your app.

### App Metadata
The integration automatically registers:
- `app_type: 'electron'`
- `app_version: '1.0.0'`

## Common Patterns

### Form Submission Tracking
```typescript
const handleFormSubmit = async (formData) => {
  try {
    await submitForm(formData);
    captureEvent('form_submitted', {
      form_name: 'contact_form',
      success: true
    });
  } catch (error) {
    captureEvent('form_submitted', {
      form_name: 'contact_form',
      success: false,
      error: error.message
    });
  }
};
```

### Feature Usage Tracking
```typescript
const handleFeatureUse = (featureName: string) => {
  captureEvent('feature_used', {
    feature_name: featureName,
    timestamp: new Date().toISOString(),
    user_type: 'premium'
  });
};
```

## Troubleshooting

### PostHog Not Loading
1. Check that environment variables are set correctly
2. Verify network connectivity
3. Check browser console for error messages
4. Ensure PostHog key and host are valid

### Events Not Appearing
1. Check that `isLoaded` returns `true` before capturing events
2. Verify PostHog project settings
3. Check for ad blockers or network restrictions
4. Look for console errors

### Electron-Specific Issues
1. **CSP Errors**: The integration uses memory persistence to avoid CSP issues
2. **Network Restrictions**: Ensure your Electron app allows external network requests
3. **Environment Variables**: Make sure Vite environment variables are properly configured

## Best Practices

1. **Always check `isLoaded`** before capturing events
2. **Use meaningful event names** that describe user actions
3. **Include relevant context** in event properties
4. **Don't track sensitive information** like passwords or personal data
5. **Test in development** with console logging enabled
6. **Monitor PostHog dashboard** to ensure events are being received

## Security Considerations

- Environment variables are prefixed with `VITE_PUBLIC_` making them accessible in the frontend
- No sensitive data should be tracked
- Memory-only persistence means data doesn't persist between app restarts
- All network requests go through PostHog's secure endpoints

## Performance Impact

The integration is designed to be lightweight:
- Events are batched to reduce network requests
- Memory-only persistence reduces I/O operations
- Error handling prevents blocking the main thread
- Lazy loading ensures PostHog doesn't slow down app startup 