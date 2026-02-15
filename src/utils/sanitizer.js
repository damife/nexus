import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities
 * Comprehensive security for user inputs and backend outputs
 */

// HTML Sanitization
export const sanitizeHTML = (html) => {
  if (typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false
  });
};

// Text Sanitization
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Email Sanitization
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .substring(0, 254); // RFC 5321 limit
};

// Phone Number Sanitization
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  
  return phone
    .replace(/[^\d+\-\s()]/g, '') // Keep only digits, +, -, spaces, parentheses
    .trim()
    .substring(0, 20); // Reasonable limit
};

// URL Sanitization
export const sanitizeURL = (url) => {
  if (typeof url !== 'string') return '';
  
  try {
    // Remove dangerous protocols
    const cleanUrl = url.replace(/javascript:/gi, '').replace(/data:/gi, '');
    
    // Validate URL format
    const urlObj = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '';
    }
    
    return urlObj.toString().substring(0, 2048); // Reasonable limit
  } catch {
    return '';
  }
};

// Numeric Input Sanitization
export const sanitizeNumber = (value, min = null, max = null, decimals = 2) => {
  if (value === null || value === undefined || value === '') return null;
  
  const num = parseFloat(value.toString().replace(/[^\d.-]/g, ''));
  
  if (isNaN(num)) return null;
  
  let result = num;
  
  if (min !== null && result < min) result = min;
  if (max !== null && result > max) result = max;
  
  return parseFloat(result.toFixed(decimals));
};

// SWIFT BIC Sanitization
export const sanitizeBIC = (bic) => {
  if (typeof bic !== 'string') return '';
  
  return bic
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Keep only alphanumeric
    .trim()
    .substring(0, 11); // BIC standard length
};

// SWIFT Message Field Sanitization
export const sanitizeSwiftField = (field, maxLength = null) => {
  if (typeof field !== 'string') return '';
  
  let sanitized = field
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
  
  if (maxLength !== null) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

// File Name Sanitization
export const sanitizeFileName = (fileName) => {
  if (typeof fileName !== 'string') return '';
  
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 255); // Reasonable limit
};

// SQL Injection Prevention
export const sanitizeSQLInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/['"\\]/g, '\\$&') // Escape quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .trim();
};

// XSS Prevention for JSON
export const sanitizeJSON = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const cleanObj = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const cleanKey = sanitizeText(key);
      let cleanValue = obj[key];
      
      if (typeof cleanValue === 'string') {
        cleanValue = sanitizeText(cleanValue);
      } else if (typeof cleanValue === 'object' && cleanValue !== null) {
        cleanValue = sanitizeJSON(cleanValue);
      }
      
      cleanObj[cleanKey] = cleanValue;
    }
  }
  
  return cleanObj;
};

// Comprehensive Input Validator
export const validateAndSanitize = (data, schema) => {
  const errors = [];
  const sanitized = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    let sanitizedValue = value;
    
    // Skip if field is not required and value is empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }
    
    // Required field validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Type validation and sanitization
    switch (rules.type) {
      case 'email':
        sanitizedValue = sanitizeEmail(value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedValue)) {
          errors.push(`${field} must be a valid email`);
        }
        break;
        
      case 'phone':
        sanitizedValue = sanitizePhone(value);
        if (sanitizedValue && !/^\+?[\d\s\-\(\)]+$/.test(sanitizedValue)) {
          errors.push(`${field} must be a valid phone number`);
        }
        break;
        
      case 'url':
        sanitizedValue = sanitizeURL(value);
        if (value && !sanitizedValue) {
          errors.push(`${field} must be a valid URL`);
        }
        break;
        
      case 'number':
        sanitizedValue = sanitizeNumber(value, rules.min, rules.max, rules.decimals);
        if (value !== '' && sanitizedValue === null) {
          errors.push(`${field} must be a valid number`);
        }
        break;
        
      case 'bic':
        sanitizedValue = sanitizeBIC(value);
        if (sanitizedValue && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(sanitizedValue)) {
          errors.push(`${field} must be a valid BIC code`);
        }
        break;
        
      case 'swift':
        sanitizedValue = sanitizeSwiftField(value, rules.maxLength);
        break;
        
      case 'html':
        sanitizedValue = sanitizeHTML(value);
        break;
        
      case 'text':
      default:
        sanitizedValue = sanitizeText(value);
        break;
    }
    
    // Length validation
    if (rules.minLength && sanitizedValue.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
      errors.push(`${field} must not exceed ${rules.maxLength} characters`);
    }
    
    // Pattern validation
    if (rules.pattern && !new RegExp(rules.pattern).test(sanitizedValue)) {
      errors.push(`${field} format is invalid`);
    }
    
    sanitized[field] = sanitizedValue;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

// Rate Limiting Key Generator
export const generateRateLimitKey = (userId, action, ip) => {
  const cleanUserId = sanitizeText(userId.toString());
  const cleanAction = sanitizeText(action);
  const cleanIP = sanitizeText(ip);
  
  return `rate_limit:${cleanUserId}:${cleanAction}:${cleanIP}`;
};

// CSRF Token Generator
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Content Security Policy Header
export const getCSPHeader = () => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
};

// Security Headers
export const getSecurityHeaders = () => {
  return {
    'Content-Security-Policy': getCSPHeader(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeNumber,
  sanitizeBIC,
  sanitizeSwiftField,
  sanitizeFileName,
  sanitizeSQLInput,
  sanitizeJSON,
  validateAndSanitize,
  generateRateLimitKey,
  generateCSRFToken,
  getCSPHeader,
  getSecurityHeaders
};
