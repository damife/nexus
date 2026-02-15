import { body, validationResult } from 'express-validator';
import logger from '../config/logger.js';

export const validateMessage = [
  body('messageType')
    .notEmpty().withMessage('Message type is required')
    .isIn(['MT103', 'MT202', 'MT940', 'MT942', 'pacs.008', 'camt.053', 'camt.054'])
    .withMessage('Invalid message type'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['mt', 'mx'])
    .withMessage('Category must be mt or mx'),
  
  body('senderBIC')
    .notEmpty().withMessage('Sender BIC is required')
    .isLength({ min: 8, max: 11 })
    .withMessage('Sender BIC must be 8-11 characters')
    .matches(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage('Invalid BIC format'),
  
  body('receiverBIC')
    .notEmpty().withMessage('Receiver BIC is required')
    .isLength({ min: 8, max: 11 })
    .withMessage('Receiver BIC must be 8-11 characters')
    .matches(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/)
    .withMessage('Invalid BIC format'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('Currency must be 3 uppercase letters'),
  
  body('reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Reference must be less than 100 characters'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation errors', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validatePayment = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('currency')
    .optional()
    .isIn(['BTC', 'ETH', 'USDT', 'TRX'])
    .withMessage('Invalid currency'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export const validate2FA = [
  body('token')
    .notEmpty().withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('2FA token must be 6 digits'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

export default { validateMessage, validatePayment, validate2FA };

