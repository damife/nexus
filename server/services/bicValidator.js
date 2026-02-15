import axios from 'axios';
import logger from '../config/logger.js';

/**
 * BIC Validator Service
 * Validates BIC codes against SWIFT standards and real BIC database
 * Uses SWIFT Codes API (swiftcodesapi.com) for real-time validation
 */
class BICValidator {
  constructor() {
    // Common BIC format validation
    this.bicPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    
    // API endpoint for BIC validation (free tier available)
    // Alternative: https://api.swiftcodesapi.com/v1/bic/{bic}
    // Using openiban.com as primary (free, no API key required)
    this.apiEndpoints = {
      openiban: 'https://openiban.com/validate-bic',
      swiftcodes: 'https://api.swiftcodesapi.com/v1/bic',
      fincodes: 'https://api.fincodesapi.com/v1/bic'
    };
    
    // Cache for validated BICs (to reduce API calls)
    this.validationCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Validate BIC format
   * @param {string} bic - BIC code to validate
   * @returns {object} - { valid: boolean, errors: array }
   */
  validateFormat(bic) {
    const errors = [];

    if (!bic) {
      errors.push('BIC is required');
      return { valid: false, errors };
    }

    const upperBIC = bic.toUpperCase().trim();

    // Length check
    if (upperBIC.length !== 8 && upperBIC.length !== 11) {
      errors.push('BIC must be 8 or 11 characters');
    }

    // Format check
    if (!this.bicPattern.test(upperBIC)) {
      errors.push('Invalid BIC format. Must be: 4 letters (bank) + 2 letters (country) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)');
    }

    // Character validation
    if (upperBIC.length >= 4) {
      const countryCode = upperBIC.substring(4, 6);
      if (!/^[A-Z]{2}$/.test(countryCode)) {
        errors.push('Invalid country code in BIC');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized: errors.length === 0 ? upperBIC : null
    };
  }

  /**
   * Validate BIC against real database using API
   * @param {string} bic - BIC code to validate
   * @returns {Promise<object>} - { valid: boolean, exists: boolean, details: object }
   */
  async validateAgainstDatabase(bic) {
    try {
      const formatCheck = this.validateFormat(bic);
      if (!formatCheck.valid) {
        return {
          valid: false,
          exists: false,
          errors: formatCheck.errors
        };
      }

      const normalizedBIC = formatCheck.normalized;

      // Check cache first
      const cached = this.validationCache.get(normalizedBIC);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.debug('BIC validation cache hit', { bic: normalizedBIC });
        return cached.result;
      }

      // Try multiple API endpoints for reliability
      let validationResult = null;
      let lastError = null;

      // Try openiban.com (free, no API key)
      try {
        const response = await axios.get(`${this.apiEndpoints.openiban}?bic=${normalizedBIC}`, {
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.data && response.data.valid === true) {
          validationResult = {
            valid: true,
            exists: true,
            normalized: normalizedBIC,
            bankName: response.data.bank?.name || null,
            country: response.data.bank?.country || null,
            message: 'BIC validated successfully'
          };
        }
      } catch (error) {
        lastError = error.message;
        logger.debug('openiban API error', { bic: normalizedBIC, error: error.message });
      }

      // Fallback: Try swiftcodesapi.com if first fails
      if (!validationResult) {
        try {
          // Note: This may require API key in production
          const response = await axios.get(`${this.apiEndpoints.swiftcodes}/${normalizedBIC}`, {
            timeout: 5000,
            headers: {
              'Accept': 'application/json'
            }
          });

          if (response.data && response.data.bic) {
            validationResult = {
              valid: true,
              exists: true,
              normalized: normalizedBIC,
              bankName: response.data.bank || response.data.bank_name || null,
              country: response.data.country || response.data.country_code || null,
              city: response.data.city || null,
              message: 'BIC validated successfully'
            };
          }
        } catch (error) {
          lastError = error.message;
          logger.debug('swiftcodesapi error', { bic: normalizedBIC, error: error.message });
        }
      }

      // If both APIs fail, do format-only validation
      if (!validationResult) {
        logger.warn('BIC API validation failed, using format validation only', { 
          bic: normalizedBIC, 
          lastError 
        });
        
        validationResult = {
          valid: true,
          exists: false, // Unknown if exists in database
          normalized: normalizedBIC,
          message: 'BIC format is valid but could not be verified against database. Please verify manually.',
          warning: 'Database lookup unavailable'
        };
      }

      // Cache the result
      this.validationCache.set(normalizedBIC, {
        result: validationResult,
        timestamp: Date.now()
      });

      return validationResult;
    } catch (error) {
      logger.error('BIC validation error', { bic, error: error.message, stack: error.stack });
      return {
        valid: false,
        exists: false,
        errors: [`Error validating BIC: ${error.message}`]
      };
    }
  }

  /**
   * Validate both sender and receiver BIC
   * @param {string} senderBIC - Sender BIC
   * @param {string} receiverBIC - Receiver BIC
   * @returns {Promise<object>} - Validation result
   */
  async validateBICs(senderBIC, receiverBIC) {
    const errors = [];
    const results = {
      sender: null,
      receiver: null,
      valid: false
    };

    // Validate sender BIC
    const senderValidation = await this.validateAgainstDatabase(senderBIC);
    if (!senderValidation.valid) {
      errors.push(`Sender BIC: ${senderValidation.errors.join(', ')}`);
    } else {
      results.sender = senderValidation;
    }

    // Validate receiver BIC
    const receiverValidation = await this.validateAgainstDatabase(receiverBIC);
    if (!receiverValidation.valid) {
      errors.push(`Receiver BIC: ${receiverValidation.errors.join(', ')}`);
    } else {
      results.receiver = receiverValidation;
    }

    // Check if BICs are the same
    if (senderValidation.normalized && receiverValidation.normalized) {
      if (senderValidation.normalized === receiverValidation.normalized) {
        errors.push('Sender and Receiver BIC cannot be the same');
      }
    }

    results.valid = errors.length === 0;
    results.errors = errors;

    return results;
  }

  /**
   * Extract country code from BIC
   * @param {string} bic - BIC code
   * @returns {string|null} - ISO country code
   */
  getCountryCode(bic) {
    const formatCheck = this.validateFormat(bic);
    if (!formatCheck.valid || !formatCheck.normalized) {
      return null;
    }
    return formatCheck.normalized.substring(4, 6);
  }

  /**
   * Extract bank code from BIC
   * @param {string} bic - BIC code
   * @returns {string|null} - Bank code
   */
  getBankCode(bic) {
    const formatCheck = this.validateFormat(bic);
    if (!formatCheck.valid || !formatCheck.normalized) {
      return null;
    }
    return formatCheck.normalized.substring(0, 4);
  }
}

export default new BICValidator();

