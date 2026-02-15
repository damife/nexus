import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';
import crypto from 'crypto';

/**
 * Security Middleware for Rate Limiting, Debouncing, and Idempotency
 */

// Simple sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Rate Limiting Configuration
export const createRateLimit = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes default
    max: options.max || 100, // 100 requests default
    message: {
      success: false,
      message: options.message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => {
      return req.ip + ':' + (req.user?.id || 'anonymous');
    }),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    ...options
  });
};

// Auth-specific rate limiting
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes per IP
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

// Payment-specific rate limiting
export const paymentRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment requests per minute
  message: 'Too many payment requests, please try again later.'
});

// General API rate limiting
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.'
});

// Debouncing Middleware
const debounceStore = new Map();

export const createDebounce = (delay = 1000) => {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}:${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    
    if (debounceStore.has(key)) {
      const lastRequest = debounceStore.get(key);
      if (now - lastRequest < delay) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before making another request.',
          retryAfter: Math.ceil((delay - (now - lastRequest)) / 1000)
        });
      }
    }
    
    debounceStore.set(key, now);
    
    // Clean up old entries
    setTimeout(() => {
      if (debounceStore.has(key) && debounceStore.get(key) === now) {
        debounceStore.delete(key);
      }
    }, delay);
    
    next();
  };
};

// Auth-specific debouncing
export const authDebounce = createDebounce(1000); // 1 second debounce for auth

// Payment-specific debouncing
export const paymentDebounce = createDebounce(2000); // 2 seconds debounce for payments

// Idempotency Middleware
export const createIdempotency = () => {
  return async (req, res, next) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    
    if (!idempotencyKey) {
      return next(); // Skip if no idempotency key
    }
    
    try {
      // Check if this request was already processed
      const existingResponse = await query(
        'SELECT response_data, created_at FROM requests WHERE idempotency_key = $1 AND endpoint = $2',
        [idempotencyKey, req.path]
      );
      
      if (existingResponse.rows.length > 0) {
        const storedResponse = existingResponse.rows[0];
        return res.status(200).json({
          success: true,
          data: JSON.parse(storedResponse.response_data),
          idempotent: true,
          originalTimestamp: storedResponse.created_at
        });
      }
      
      // Store the request and override res.json to capture response
      await query(
        'INSERT INTO requests (idempotency_key, endpoint, request_data) VALUES ($1, $2, $3)',
        [idempotencyKey, req.path, JSON.stringify(req.body)]
      );
      
      const originalJson = res.json;
      res.json = function(data) {
        // Store the response for future idempotent requests
        query(
          'UPDATE requests SET response_data = $1, status = $2 WHERE idempotency_key = $3 AND endpoint = $4',
          [JSON.stringify(data), res.statusCode, idempotencyKey, req.path]
        ).catch(err => console.error('Error storing idempotent response:', err));
        
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Idempotency middleware error:', error);
      next(); // Continue without idempotency if there's an error
    }
  };
};

// Combined security middleware for auth endpoints
export const authSecurity = [
  authRateLimit,
  authDebounce,
  createIdempotency()
];

// Combined security middleware for payment endpoints
export const paymentSecurity = [
  paymentRateLimit,
  paymentDebounce,
  createIdempotency()
];

// Combined security middleware for general API endpoints
export const apiSecurity = [
  generalRateLimit
];

// User Input Validation Schema
export const validateUserInput = (schema) => {
  return (req, res, next) => {
    try {
      // Simple validation without complex schema
      req.body = sanitizeObject(req.body);
      next();
    } catch (error) {
      console.error('Error validating user input:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error',
        error: error.message
      });
    }
  };
};

// Simple validation function for basic input validation
export const validateInput = (data, rules) => {
  const errors = [];
  
  if (rules.required && (!data || data === '')) {
    errors.push('This field is required');
  }
  
  if (rules.email && data && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) {
    errors.push('Invalid email format');
  }
  
  if (rules.minLength && data && data.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }
  
  if (rules.maxLength && data && data.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Request Body Sanitization Middleware
export const sanitizeRequestBody = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error) {
    console.error('Error sanitizing request body:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid request data',
      error: error.message
    });
  }
};

// Query Parameter Sanitization Middleware
export const sanitizeQueryParams = (req, res, next) => {
  try {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    next();
  } catch (error) {
    console.error('Error sanitizing query params:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      error: error.message
    });
  }
};

// URL Parameter Sanitization Middleware
export const sanitizeURLParams = (req, res, next) => {
  try {
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    next();
  } catch (error) {
    console.error('Error sanitizing URL params:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid URL parameters',
      error: error.message
    });
  }
};
