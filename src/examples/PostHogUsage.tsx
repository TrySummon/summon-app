import React from 'react';
import { usePostHog } from '../hooks/usePostHog';

// Example component showing how to use PostHog throughout your app
export const PostHogUsageExample = () => {
  const { captureEvent, capturePageView, identify, reset, isLoaded } = usePostHog();

  const handleButtonClick = () => {
    // Track a custom event
    captureEvent('button_clicked', {
      button_name: 'example_button',
      page: 'usage_example',
      timestamp: new Date().toISOString()
    });
  };

  const handleUserLogin = (userId: string) => {
    // Identify a user when they log in
    identify(userId, {
      login_method: 'example',
      timestamp: new Date().toISOString()
    });
  };

  const handleUserLogout = () => {
    // Reset PostHog when user logs out
    reset();
  };

  const handlePageView = () => {
    // Manually track a page view (usually done automatically by PostHogRouter)
    capturePageView('/example-page', {
      page_title: 'Example Page',
      timestamp: new Date().toISOString()
    });
  };

  return (
    <div>
      <h2>PostHog Usage Example</h2>
      <p>PostHog Status: {isLoaded ? 'Loaded' : 'Not Loaded'}</p>
      
      <button onClick={handleButtonClick}>
        Track Button Click
      </button>
      
      <button onClick={() => handleUserLogin('user123')}>
        Identify User
      </button>
      
      <button onClick={handleUserLogout}>
        Reset User
      </button>
      
      <button onClick={handlePageView}>
        Track Page View
      </button>
    </div>
  );
};

// Example of tracking events in different scenarios:

// 1. Track form submissions
export const trackFormSubmission = (formName: string, success: boolean) => {
  // You can import and use the hook functions directly
  const { captureEvent } = usePostHog();
  
  captureEvent('form_submitted', {
    form_name: formName,
    success: success,
    timestamp: new Date().toISOString()
  });
};

// 2. Track API calls
export const trackApiCall = (endpoint: string, method: string, statusCode: number) => {
  const { captureEvent } = usePostHog();
  
  captureEvent('api_call', {
    endpoint: endpoint,
    method: method,
    status_code: statusCode,
    timestamp: new Date().toISOString()
  });
};

// 3. Track feature usage
export const trackFeatureUsage = (featureName: string, context?: Record<string, any>) => {
  const { captureEvent } = usePostHog();
  
  captureEvent('feature_used', {
    feature_name: featureName,
    ...context,
    timestamp: new Date().toISOString()
  });
}; 