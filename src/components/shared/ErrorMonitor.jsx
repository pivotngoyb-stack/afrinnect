import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ErrorContext = createContext();

export function ErrorMonitorProvider({ children }) {
  const [errors, setErrors] = useState([]);
  const [showErrorPanel, setShowErrorPanel] = useState(false);

  useEffect(() => {
    // Global error handler
    const handleError = (event) => {
      logError({
        type: 'runtime_error',
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    };

    // Promise rejection handler
    const handleRejection = (event) => {
      logError({
        type: 'promise_rejection',
        message: event.reason?.message || String(event.reason),
        timestamp: new Date().toISOString()
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const logError = async (error) => {
    setErrors(prev => [...prev, error]);
    
    // Show toast for critical errors
    if (error.severity === 'critical') {
      toast.error('Critical Error', {
        description: error.message,
        duration: 10000
      });
    }

    // Log to backend for admin review
    try {
      const user = await base44.auth.me();
      await base44.entities.AdminAuditLog.create({
        admin_user_id: user?.id || 'unknown',
        admin_email: user?.email || 'unknown',
        action_type: 'user_error',
        details: {
          error: error.message,
          type: error.type,
          stack: error.stack,
          page: window.location.pathname,
          userAgent: navigator.userAgent
        }
      });
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  };

  const clearErrors = () => setErrors([]);

  return (
    <ErrorContext.Provider value={{ errors, logError, clearErrors }}>
      {children}
      
      {/* Error Panel */}
      {errors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setShowErrorPanel(!showErrorPanel)}
            variant="destructive"
            className="rounded-full shadow-lg"
          >
            <AlertTriangle size={18} className="mr-2" />
            {errors.length} Error{errors.length > 1 ? 's' : ''}
          </Button>

          {showErrorPanel && (
            <Card className="absolute bottom-14 right-0 w-96 max-h-96 overflow-auto shadow-2xl">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold">Error Log</h4>
                  <Button size="sm" variant="ghost" onClick={() => setShowErrorPanel(false)}>
                    <X size={16} />
                  </Button>
                </div>
                {errors.map((error, idx) => (
                  <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-900">{error.type}</p>
                    <p className="text-xs text-red-700 mt-1">{error.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
                <Button onClick={clearErrors} variant="outline" className="w-full">
                  Clear All
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export const useErrorMonitor = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorMonitor must be used within ErrorMonitorProvider');
  }
  return context;
};