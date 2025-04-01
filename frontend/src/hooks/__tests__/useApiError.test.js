import { renderHook, act } from '@testing-library/react';
import useApiError from '../useApiError';
import { toast } from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    error: jest.fn()
  }
}));

describe('useApiError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useApiError());

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.retryCount).toBe(0);
  });

  it('handles API errors with custom message', async () => {
    const { result } = renderHook(() => useApiError());

    const error = new Error('API Error');
    error.response = { status: 500 };

    await act(async () => {
      result.current.handleError(error, 'Custom error message');
    });

    expect(result.current.error).toBe('Custom error message');
    expect(toast.error).toHaveBeenCalledWith('Custom error message');
  });

  it('handles different HTTP status codes', async () => {
    const { result } = renderHook(() => useApiError());

    const statusCodes = [400, 401, 403, 404, 429, 500];
    const expectedMessages = [
      'Invalid request. Please check your input.',
      'Please log in to continue.',
      'You do not have permission to perform this action.',
      'The requested resource was not found.',
      'Too many requests. Please try again later.',
      'Server error. Please try again later.'
    ];

    for (let i = 0; i < statusCodes.length; i++) {
      const error = new Error('API Error');
      error.response = { status: statusCodes[i] };

      await act(async () => {
        result.current.handleError(error);
      });

      expect(result.current.error).toBe(expectedMessages[i]);
      expect(toast.error).toHaveBeenCalledWith(expectedMessages[i]);
    }
  });

  it('handles network errors', async () => {
    const { result } = renderHook(() => useApiError());

    const error = new Error('Network Error');
    error.request = {};

    await act(async () => {
      result.current.handleError(error);
    });

    expect(result.current.error).toBe('Network error. Please check your connection.');
    expect(toast.error).toHaveBeenCalledWith('Network error. Please check your connection.');
  });

  it('retries operation on failure', async () => {
    const { result } = renderHook(() => useApiError(3, 100));

    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('Success');

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('stops retrying after max attempts', async () => {
    const { result } = renderHook(() => useApiError(2, 100));

    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockRejectedValueOnce(new Error('Third attempt failed'));

    await act(async () => {
      await result.current.retryOperation(mockOperation);
    });

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe('Maximum retry attempts reached. Please try again later.');
  });

  it('clears error state', async () => {
    const { result } = renderHook(() => useApiError());

    const error = new Error('API Error');
    error.response = { status: 500 };

    await act(async () => {
      result.current.handleError(error);
    });

    expect(result.current.error).toBeTruthy();

    await act(async () => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
  });

  it('calls onSuccess callback after successful retry', async () => {
    const { result } = renderHook(() => useApiError(3, 100));

    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('Success');

    const onSuccess = jest.fn();

    await act(async () => {
      await result.current.retryOperation(mockOperation, onSuccess);
    });

    expect(onSuccess).toHaveBeenCalledWith('Success');
  });
}); 