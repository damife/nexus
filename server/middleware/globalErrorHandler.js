/**
 * Global Error Handler Middleware for SwiftNexus Enterprise
 * Comprehensive error handling and logging
 */

import logger from '../config/logger.js';

/**
 * Global Error Handler Middleware
 */
export const globalErrorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    tenantId: req.tenant?.id || req.user?.tenantId
  });

  // Determine error type and status code
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = {};

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = error.details || {};
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
    code = 'FORBIDDEN';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (error.name === 'ConflictError') {
    statusCode = 409;
    message = 'Resource conflict';
    code = 'CONFLICT';
  } else if (error.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = 'Too many requests';
    code = 'RATE_LIMIT_EXCEEDED';
  } else if (error.code === '23505') { // PostgreSQL unique violation
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_RESOURCE';
  } else if (error.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
    code = 'INVALID_REFERENCE';
  } else if (error.code === '23502') { // PostgreSQL not null violation
    statusCode = 400;
    message = 'Required field missing';
    code = 'REQUIRED_FIELD_MISSING';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    code = 'SERVICE_UNAVAILABLE';
  } else if (error.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Service timeout';
    code = 'SERVICE_TIMEOUT';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Add details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = details;
    errorResponse.stack = error.stack;
    errorResponse.originalError = error.message;
  }

  // Add request ID if available
  if (req.requestId) {
    errorResponse.requestId = req.requestId;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req, res) => {
  logger.warn('404 Not Found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Resource not found',
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class TooManyRequestsError extends Error {
  constructor(message = 'Too many requests') {
    super(message);
    this.name = 'TooManyRequestsError';
  }
}

/**
 * Error Logging Utility
 */
export const logError = (error, context = {}) => {
  logger.error('Application error', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  });
};

/**
 * Error Recovery Utility
 */
export const handleDatabaseError = (error) => {
  if (error.code === 'ECONNREFUSED') {
    throw new Error('Database connection refused. Please check database server.');
  } else if (error.code === 'ETIMEDOUT') {
    throw new Error('Database connection timeout. Please try again.');
  } else if (error.code === '23505') {
    throw new ConflictError('Resource already exists');
  } else if (error.code === '23503') {
    throw new ValidationError('Invalid reference to related resource');
  } else if (error.code === '23502') {
    throw new ValidationError('Required field is missing');
  } else {
    throw error;
  }
};

/**
 * Rate Limit Error Handler
 */
export const handleRateLimitError = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent')
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
    timestamp: new Date().toISOString(),
    retryAfter: 60 // 60 seconds
  });
};

export default {
  globalErrorHandler,
  asyncHandler,
  notFoundHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  logError,
  handleDatabaseError,
  handleRateLimitError
};
