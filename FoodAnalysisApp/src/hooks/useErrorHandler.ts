import { useCallback, useState } from 'react';
import { ErrorHandler, AppError, RetryManager } from '../utils/errorHandler';

interface UseErrorHandlerReturn {
  error: AppError | null;
  isLoading: boolean;
  clearError: () => void;
  handleError: (error: Error | AppError) => void;
  executeWithErrorHandling: <T>(
    operation: () => Promise<T>,
    options?: {
      showAlert?: boolean;
      maxRetries?: number;
      loadingMessage?: string;
    }
  ) => Promise<T | null>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<AppError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: Error | AppError) => {
    let appError: AppError;
    
    if (error instanceof AppError) {
      appError = error;
    } else {
      ErrorHandler.handleError(error, false);
      const errorLog = ErrorHandler.getErrorLog();
      appError = errorLog[0] || new AppError(
        'UNKNOWN' as any,
        error.message,
        'An unexpected error occurred',
        'MEDIUM' as any,
        error
      );
    }
    
    setError(appError);
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      showAlert?: boolean;
      maxRetries?: number;
      loadingMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      showAlert = true,
      maxRetries = 3,
      loadingMessage,
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const result = await RetryManager.withRetry(
        operation,
        maxRetries,
        (error) => {
          // Only retry network and AI analysis errors
          const message = error.message.toLowerCase();
          return message.includes('network') || 
                 message.includes('fetch') || 
                 message.includes('ai') ||
                 message.includes('analysis');
        }
      );

      return result;
    } catch (error) {
      const appError = error as Error;
      
      if (showAlert) {
        ErrorHandler.handleError(appError);
      } else {
        handleError(appError);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    error,
    isLoading,
    clearError,
    handleError,
    executeWithErrorHandling,
  };
};