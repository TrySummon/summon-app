import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { usePostHog } from '../hooks/usePostHog';

export const PostHogRouter = () => {
  const router = useRouter();
  const { capturePageView, isLoaded } = usePostHog();

  useEffect(() => {
    if (!isLoaded) return;

    // Track initial page view
    const currentPath = router.state.location.pathname;
    capturePageView(currentPath, {
      route: currentPath,
      timestamp: new Date().toISOString()
    });

    // Set up listener for route changes
    const unsubscribe = router.subscribe('onLoad', ({ toLocation }) => {
      if (toLocation.pathname) {
        capturePageView(toLocation.pathname, {
          route: toLocation.pathname,
          timestamp: new Date().toISOString()
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [router, capturePageView, isLoaded]);

  return null; // This component doesn't render anything
}; 