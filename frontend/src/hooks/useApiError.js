import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const useApiError = (maxRetries = 3, retryDelay = 1000) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback((error, customMessage = null) => {
    let errorMessage = customMessage || 'An unexpected error occurred.';
    
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 400:
          errorMessage = 'Invalid request. Please check your input.';
          break;
        case 401:
          errorMessage = 'Please log in to continue.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        default:
          errorMessage = error.response.data?.message || 'An error occurred.';
      }
    } else if (error.request) {
      // Request made but no response
      errorMessage = 'Network error. Please check your connection.';
    }

    setError(errorMessage);
    toast.error(errorMessage);
    return errorMessage;
  }, []);

  const retryOperation = useCallback(async (operation, onSuccess) => {
    if (retryCount >= maxRetries) {
      setError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    setIsLoading(true);
    setRetryCount(prev => prev + 1);

    try {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      const result = await operation();
      setError(null);
      setRetryCount(0);
      if (onSuccess) onSuccess(result);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, maxRetries, retryDelay, handleError]);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    error,
    isLoading,
    retryCount,
    handleError,
    retryOperation,
    clearError
  };
};

export default useApiError; 