/**
 * Error handling utility for TypeShala
 * Provides centralized error handling, logging, and fallback mechanisms
 */
const db = require('../config/database');
const { logError } = require('./logger');

/**
 * Standard error response structure
 * @param {number} status - HTTP status code
 * @param {string} message - User-friendly error message
 * @param {string} code - Error code for client-side error handling
 * @param {Object} details - Additional error details (only in development)
 * @param {string} errorId - Unique error ID for tracking
 * @returns {Object} Standardized error response object
 */
const createErrorResponse = (status, message, code = null, details = null, errorId = null) => {
  const errorResponse = {
    success: false,
    error: {
      status,
      message,
      code: code || `ERR_${status}`,
      errorId
    }
  };

  // Add details only in development environment
  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = details;
  }

  return errorResponse;
};

/**
 * Custom error class with additional properties
 */
class AppError extends Error {
  constructor(message, status = 500, code = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Log API error with context data
 * @param {string} endpoint - API endpoint identifier
 * @param {Error} error - Error object
 * @param {Object} requestData - Request data for context
 * @param {string|number} userId - User ID if available
 * @returns {string} Error ID for tracking
 */
const logApiError = async (endpoint, error, requestData = {}, userId = null) => {
  // Generate error ID for tracking
  const errorId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  
  // Sanitize request data to remove sensitive information
  const sanitizedData = { ...requestData };
  
  // Remove sensitive fields
  if (sanitizedData.body) {
    if (sanitizedData.body.password) sanitizedData.body.password = '[REDACTED]';
    if (sanitizedData.body.token) sanitizedData.body.token = '[REDACTED]';
    if (sanitizedData.body.refreshToken) sanitizedData.body.refreshToken = '[REDACTED]';
  }
  
  // Format error context
  const errorContext = {
    errorId,
    endpoint,
    userId,
    request: sanitizedData,
    timestamp: new Date().toISOString(),
    statusCode: error.status || (error.response ? error.response.status : 500),
    errorCode: error.code || 'UNKNOWN_ERROR',
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  };
  
  // Log error with context
  logError('API Error:', errorContext);
  
  // Store error in database for persistent tracking if needed
  try {
    // Implement database logging here if needed
  } catch (loggingError) {
    console.error('Failed to log error to database:', loggingError);
  }
  
  return errorId;
};

/**
 * Wrapper for API handlers with automatic error handling and logging
 * @param {Function} handler - Async API handler function
 * @param {string} endpoint - API endpoint identifier for logging
 * @returns {Function} - Wrapped handler with error handling
 */
const withErrorHandling = (handler, endpoint) => {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      const userId = req.user?.id || null;
      const errorId = await logApiError(endpoint, error, {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'accept': req.headers['accept']
        }
      }, userId);
      
      // Determine appropriate status code and message
      let status = error.status || 500;
      let message = error.message || 'An error occurred while processing your request';
      let code = error.code;
      let details = error.details;
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        status = 400;
        code = 'VALIDATION_ERROR';
      } else if (error.name === 'UnauthorizedError') {
        status = 401;
        code = 'UNAUTHORIZED';
      } else if (error.name === 'ForbiddenError') {
        status = 403;
        code = 'FORBIDDEN';
      } else if (error.name === 'NotFoundError') {
        status = 404;
        code = 'NOT_FOUND';
      } else if (error.code === '23505') {
        // PostgreSQL unique violation
        status = 409;
        code = 'DUPLICATE_ENTITY';
        message = 'A resource with this identifier already exists';
      } else if (error.code === '23503') {
        // PostgreSQL foreign key violation
        status = 400;
        code = 'INVALID_REFERENCE';
        message = 'Referenced resource does not exist';
      }
      
      const errorResponse = createErrorResponse(status, message, code, details, errorId);
      return res.status(status).json(errorResponse);
    }
  };
};

/**
 * Validate request data against schema
 * @param {Object} schema - Validation schema
 * @param {string} location - Request location (body, query, params)
 * @returns {Function} Middleware function
 */
const validateRequest = (schema, location = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[location], { abortEarly: false });
      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));
        
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
      }
      
      // Replace with validated data
      req[location] = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Safe wrapper for analytics calls that shouldn't interrupt normal flow if they fail
 * @param {Function} fn - Async function to execute
 * @param {string} operationName - Name of operation for logging
 * @returns {Promise<any>} - Result of the function or null if it fails
 */
const safeAnalyticsCall = async (fn, operationName = 'analytics operation') => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Analytics operation failed (${operationName}):`, error.message);
    return null;
  }
};

/**
 * Not found handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  const response = createErrorResponse(
    404, 
    'The requested resource was not found',
    'ROUTE_NOT_FOUND'
  );
  res.status(404).json(response);
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logError('Unhandled error in request:', {
    url: req.originalUrl,
    method: req.method,
    error: err.message,
    stack: err.stack
  });
  
  // Determine status code
  const status = err.status || 500;
  
  // Create error response
  const errorResponse = createErrorResponse(
    status,
    err.message || 'Internal server error',
    err.code,
    err.details,
    err.errorId
  );
  
  res.status(status).json(errorResponse);
};

module.exports = {
  AppError,
  logApiError,
  withErrorHandling,
  validateRequest,
  safeAnalyticsCall,
  notFoundHandler,
  globalErrorHandler
}; 