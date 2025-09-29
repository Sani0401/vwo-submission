/**
 * Error Handler
 * Centralized error handling with user-friendly messages and logging
 */

import { ApiError } from './api-client';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{ error: Error; context: ErrorContext; timestamp: Date }> = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error: ApiError, context?: ErrorContext): string {
    this.logError(error, context);

    // Handle specific HTTP status codes
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input and try again.';
      case 401:
        return 'You are not authorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  /**
   * Handle general errors
   */
  handleError(error: Error, context?: ErrorContext): string {
    this.logError(error, context);

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (error.name === 'TypeError' && error.message.includes('JSON')) {
      return 'Invalid response format. Please try again.';
    }

    return error.message || 'An unexpected error occurred.';
  }

  /**
   * Get user-friendly error message for any error type
   */
  getErrorMessage(error: unknown, context?: ErrorContext): string {
    if (error instanceof ApiError) {
      return this.handleApiError(error, context);
    }

    if (error instanceof Error) {
      return this.handleError(error, context);
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unexpected error occurred.';
  }

  /**
   * Log error for debugging and monitoring
   */
  private logError(error: Error, context?: ErrorContext): void {
    const errorEntry = {
      error,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date(),
    };

    this.errorLog.push(errorEntry);

    // Keep only last 100 errors to prevent memory leaks
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: errorEntry.timestamp,
      });
    }

    // In production, you might want to send errors to a logging service
    // this.sendToLoggingService(errorEntry);
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(limit: number = 10): Array<{ error: Error; context: ErrorContext; timestamp: Date }> {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error: unknown): boolean {
    if (error instanceof ApiError) {
      // Retry on network errors and 5xx status codes
      return error.status === 0 || (error.status >= 500 && error.status < 600);
    }

    if (error instanceof Error) {
      return error.name === 'NetworkError' || error.message.includes('fetch');
    }

    return false;
  }

  /**
   * Get retry delay based on error type
   */
  getRetryDelay(error: unknown, attempt: number): number {
    if (!this.isRetryableError(error)) {
      return 0;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, attempt - 1), 16000);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Utility functions for common error scenarios
export const handleApiError = (error: unknown, context?: ErrorContext): string => {
  return errorHandler.getErrorMessage(error, context);
};

export const isRetryableError = (error: unknown): boolean => {
  return errorHandler.isRetryableError(error);
};

export const getRetryDelay = (error: unknown, attempt: number): number => {
  return errorHandler.getRetryDelay(error, attempt);
};
