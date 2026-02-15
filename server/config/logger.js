import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'swiftnexus-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Payment-specific logging
export const paymentLogger = {
  logPayment: (paymentId, action, data) => {
    logger.info('Payment Event', {
      type: 'payment',
      paymentId,
      action,
      data,
      timestamp: new Date().toISOString()
    });
  },
  
  logValidation: (paymentId, result, errors) => {
    logger.info('Payment Validation', {
      type: 'validation',
      paymentId,
      valid: result,
      errors: errors || []
    });
  },
  
  logTransformation: (paymentId, fromFormat, toFormat, success) => {
    logger.info('Payment Transformation', {
      type: 'transformation',
      paymentId,
      fromFormat,
      toFormat,
      success
    });
  },
  
  logQueue: (paymentId, queueName, action) => {
    logger.info('Queue Event', {
      type: 'queue',
      paymentId,
      queueName,
      action
    });
  },
  
  logError: (paymentId, error, context) => {
    logger.error('Payment Error', {
      type: 'error',
      paymentId,
      error: error.message,
      stack: error.stack,
      context
    });
  }
};

// Export the logger instance as default for compatibility
export default logger;

