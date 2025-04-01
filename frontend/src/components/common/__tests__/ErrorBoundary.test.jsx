import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  }
}));

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('renders custom error message when provided', () => {
    render(
      <ErrorBoundary errorMessage="Custom error message">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('resets error state when retry is successful', () => {
    const onRetry = jest.fn();
    const { rerender } = render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Initially shows error state
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Rerender with no error
    rerender(
      <ErrorBoundary onRetry={onRetry}>
        <div>Success content</div>
      </ErrorBoundary>
    );

    // Should show success content
    expect(screen.getByText('Success content')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('logs error to console when error occurs', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error caught by boundary:',
      expect.any(Error),
      expect.any(Object)
    );
  });
}); 