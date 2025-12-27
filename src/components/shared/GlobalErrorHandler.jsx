import { useEffect } from 'react';
import { toast } from 'sonner';

export function GlobalErrorHandler() {
  useEffect(() => {
    // Handle fetch errors globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Handle rate limiting
        if (response.status === 429) {
          toast.error('Too many requests', {
            description: 'Please wait a moment and try again'
          });
        }
        
        // Handle authentication errors
        if (response.status === 401) {
          console.warn('Authentication required');
        }
        
        // Handle server errors
        if (response.status >= 500) {
          toast.error('Server error', {
            description: 'Please try again later'
          });
        }
        
        return response;
      } catch (error) {
        // Network error
        if (!navigator.onLine) {
          toast.error('No internet connection');
        } else {
          toast.error('Network error', {
            description: 'Please check your connection'
          });
        }
        throw error;
      }
    };

    // Handle console errors in production
    if (process.env.NODE_ENV === 'production') {
      const originalError = console.error;
      console.error = (...args) => {
        // Log to error tracking service
        originalError(...args);
      };
    }

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}