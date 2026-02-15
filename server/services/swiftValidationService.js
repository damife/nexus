import logger from '../config/logger.js';

class SwiftValidationService {
  constructor() {
    // SWIFT field validation patterns based on industry standards
    this.fieldPatterns = {
      // Basic Header fields
      'BIC': /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, // 8 or 11 characters
      'SessionNumber': /^\d{6}$/, // 6 digits
      'SequenceNumber': /^\d{6}$/, // 6 digits
      
      // Application Header fields
      'MessageType': /^\d{3}$/, // 3 digits
      'Priority': /^[NUS]$/, // N, U, or S
      'DeliveryMonitoring': /^\d{1}$/, // 1 digit
      'ObsolescencePeriod': /^\d{3}$/, // 3 digits
      
      // Text Block fields - MT103
      '20': /^[A-Z0-9\/\-\.\?:\+\,\s]{1,16}$/, // Transaction Reference
      '23B': /^(CRED|SPAY|SPRI|SSTD)$/, // Bank Operation Code
      '32A': /^\d{6}[A-Z]{3}[0-9,]+$/, // Value Date/Currency/Amount
      '50K': /^\/?[A-Z0-9]{1,35}[\n\r][A-Z0-9\s\-\.\,\(\)\/\+\:]+$/, // Ordering Customer
      '59': /^\/?[A-Z0-9]{1,35}[\n\r][A-Z0-9\s\-\.\,\(\)\/\+\:]+$/, // Beneficiary Customer
      '70': /^[A-Z0-9\s\-\.\,\(\)\/\+\:]{1,140}$/, // Remittance Information
      '71A': /^(OUR|SHA|BEN)$/, // Details of Charges
      '72': /^\/[A-Z]{3}\/[A-Z0-9\s\-\.\,\(\)\/\+\:]{1,35}$/, // Sender to Receiver Info
      
      // Text Block fields - MT202
      '21': /^[A-Z0-9\/\-\.\?:\+\,\s]{1,16}$/, // Related Reference
      '56A': /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, // Intermediary Institution
      '57A': /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, // Account With Institution
      '58A': /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, // Beneficiary Institution
      
      // Text Block fields - MT940
      '25': /^[A-Z0-9]{1,35}$/, // Account Identification
      '28C': /^\d{1,5}\/\d{1,5}$/, // Statement Number
      '60F': /^[CD]\d{6}[A-Z]{3}[0-9,]+$/, // Opening Balance
      '61': /^\d{6}[CD][A-Z]{3}[0-9,]+[A-Z]{4}[A-Z0-9\s]{1,16}$/, // Statement Line
      '62F': /^[CD]\d{6}[A-Z]{3}[0-9,]+$/, // Closing Balance
      
      // MX/ISO 20022 patterns
      'ISODateTime': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, // ISO 8601 datetime
      'IBAN': /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/, // IBAN format
      'Currency': /^[A-Z]{3}$/, // 3-letter currency code
      'Amount': /^\d{1,15}(\.\d{1,3})?$/, // Amount with decimals
    };

    // Industry standard field requirements
    this.fieldRequirements = {
      'MT103': {
        required: ['20', '23B', '32A', '50K', '59'],
        optional: ['70', '71A', '72'],
        conditional: {}
      },
      'MT202': {
        required: ['20', '32A', '58A'],
        optional: ['21', '56A', '57A'],
        conditional: {}
      },
      'MT940': {
        required: ['20', '25', '28C', '60F', '62F'],
        optional: ['61'],
        conditional: {}
      }
    };
  }

  /**
   * Validate BIC code according to ISO 9362
   */
  validateBIC(bic) {
    const errors = [];
    
    if (!bic) {
      errors.push('BIC code is required');
      return { valid: false, errors };
    }

    const upperBic = bic.toUpperCase();
    
    // Check format
    if (!this.fieldPatterns.BIC.test(upperBic)) {
      errors.push('BIC must be 8 or 11 characters: 6 letters + 2 letters/digits + optional 3 letters/digits');
    }

    // Check structure
    if (upperBic.length < 8 || upperBic.length > 11) {
      errors.push('BIC length must be between 8 and 11 characters');
    }

    // Check if first 6 characters are letters
    if (!/^[A-Z]{6}/.test(upperBic)) {
      errors.push('First 6 characters of BIC must be letters (institution code)');
    }

    // Check if characters 7-8 are letters or digits
    if (!/^[A-Z]{6}[A-Z0-9]{2}/.test(upperBic)) {
      errors.push('Characters 7-8 must be letters or digits (country code)');
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized: upperBic
    };
  }

  /**
   * Validate SWIFT field according to industry standards
   */
  validateField(fieldTag, fieldValue, messageType) {
    const errors = [];
    
    if (!fieldValue && this.isFieldRequired(fieldTag, messageType)) {
      errors.push(`Field ${fieldTag} is required for ${messageType}`);
      return { valid: false, errors };
    }

    if (!fieldValue) {
      return { valid: true, errors: [] };
    }

    // Get pattern for field
    const pattern = this.fieldPatterns[fieldTag];
    if (pattern && !pattern.test(fieldValue)) {
      errors.push(`Field ${fieldTag} format is invalid`);
    }

    // Additional field-specific validations
    switch (fieldTag) {
      case '32A':
        this.validateField32A(fieldValue, errors);
        break;
      case '50K':
      case '59':
        this.validateCustomerField(fieldValue, fieldTag, errors);
        break;
      case '70':
        this.validateRemittanceInfo(fieldValue, errors);
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Field 32A - Value Date/Currency/Amount
   */
  validateField32A(value, errors) {
    const match = value.match(/^(\d{6})([A-Z]{3})([0-9,]+)$/);
    if (!match) {
      errors.push('Field 32A must be in format: YYMMDDCCCAMOUNT');
      return;
    }

    const [, datePart, currency, amount] = match;
    
    // Validate date
    const year = parseInt(datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    const currentYear = new Date().getFullYear() % 100;
    const fullYear = year > currentYear ? 1900 + year : 2000 + year;
    
    if (month < 1 || month > 12) {
      errors.push('Invalid month in date');
    }
    
    if (day < 1 || day > 31) {
      errors.push('Invalid day in date');
    }
    
    // Validate currency
    if (!this.fieldPatterns.Currency.test(currency)) {
      errors.push('Invalid currency code');
    }
    
    // Validate amount
    const cleanAmount = amount.replace(',', '');
    if (isNaN(cleanAmount) || parseFloat(cleanAmount) <= 0) {
      errors.push('Amount must be a positive number');
    }
  }

  /**
   * Validate customer fields (50K, 59)
   */
  validateCustomerField(value, fieldTag, errors) {
    const lines = value.split(/[\r\n]+/);
    
    if (lines.length > 4) {
      errors.push(`Field ${fieldTag} cannot exceed 4 lines`);
    }
    
    lines.forEach((line, index) => {
      if (line.length > 35) {
        errors.push(`Line ${index + 1} in field ${fieldTag} exceeds 35 characters`);
      }
    });
    
    // Check for account number format if present
    if (value.startsWith('/')) {
      const accountMatch = value.match(/^\/([A-Z0-9]{1,35})/);
      if (!accountMatch) {
        errors.push(`Invalid account number format in field ${fieldTag}`);
      }
    }
  }

  /**
   * Validate remittance information (Field 70)
   */
  validateRemittanceInfo(value, errors) {
    if (value.length > 140) {
      errors.push('Field 70 cannot exceed 140 characters');
    }
    
    // Check for invalid characters
    if (!/^[A-Z0-9\s\-\.\,\(\)\/\+\:]+$/.test(value)) {
      errors.push('Field 70 contains invalid characters');
    }
  }

  /**
   * Check if field is required for message type
   */
  isFieldRequired(fieldTag, messageType) {
    const requirements = this.fieldRequirements[messageType];
    return requirements && requirements.required.includes(fieldTag);
  }

  /**
   * Validate complete SWIFT message
   */
  validateSwiftMessage(messageData) {
    const errors = [];
    const warnings = [];
    
    const { messageType, senderBIC, receiverBIC, textBlock } = messageData;
    
    // Validate message type
    if (!messageType) {
      errors.push('Message type is required');
    } else if (!this.fieldRequirements[messageType]) {
      errors.push(`Unsupported message type: ${messageType}`);
    }

    // Validate BIC codes
    const senderValidation = this.validateBIC(senderBIC);
    if (!senderValidation.valid) {
      errors.push(...senderValidation.errors.map(e => `Sender BIC: ${e}`));
    }

    const receiverValidation = this.validateBIC(receiverBIC);
    if (!receiverValidation.valid) {
      errors.push(...receiverValidation.errors.map(e => `Receiver BIC: ${e}`));
    }

    // Validate text block fields
    if (textBlock && messageType) {
      const requirements = this.fieldRequirements[messageType];
      
      // Check required fields
      if (requirements.required) {
        requirements.required.forEach(fieldTag => {
          if (!textBlock[fieldTag]) {
            errors.push(`Required field ${fieldTag} is missing`);
          } else {
            const fieldValidation = this.validateField(fieldTag, textBlock[fieldTag], messageType);
            if (!fieldValidation.valid) {
              errors.push(...fieldValidation.errors);
            }
          }
        });
      }

      // Check optional fields
      if (requirements.optional) {
        requirements.optional.forEach(fieldTag => {
          if (textBlock[fieldTag]) {
            const fieldValidation = this.validateField(fieldTag, textBlock[fieldTag], messageType);
            if (!fieldValidation.valid) {
              errors.push(...fieldValidation.errors);
            }
          }
        });
      }
    }

    // Industry standard checks
    this.performIndustryStandardChecks(messageData, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      messageType,
      fieldCount: Object.keys(textBlock || {}).length
    };
  }

  /**
   * Perform industry standard compliance checks
   */
  performIndustryStandardChecks(messageData, errors, warnings) {
    const { messageType, textBlock } = messageData;

    // Check for compliance with SWIFT standards
    switch (messageType) {
      case 'MT103':
        // Check for AML indicators
        if (textBlock['32A']) {
          const amount = parseFloat(textBlock['32A'].match(/[0-9,]+$/)?.[0].replace(',', ''));
          if (amount > 1000000) {
            warnings.push('High-value transaction (>1M USD) may require additional compliance checks');
          }
        }

        // Check for round amounts (potential structuring)
        if (textBlock['32A']) {
          const amount = textBlock['32A'].match(/[0-9,]+$/)?.[0];
          if (amount && /^[0-9]+,00$/.test(amount)) {
            warnings.push('Round amount detected - potential structuring concern');
          }
        }
        break;

      case 'MT202':
        // Check for multiple intermediaries
        const intermediaries = ['56A', '57A'].filter(field => textBlock[field]);
        if (intermediaries.length > 2) {
          warnings.push('Multiple intermediaries may increase compliance risk');
        }
        break;
    }

    // Check for prohibited countries
    const prohibitedCountries = ['IR', 'KP', 'SY', 'MM'];
    if (messageData.receiverBIC) {
      const countryCode = messageData.receiverBIC.substring(4, 6);
      if (prohibitedCountries.includes(countryCode)) {
        errors.push(`Transactions to ${countryCode} are prohibited`);
      }
    }
  }

  /**
   * Generate SWIFT message with proper formatting
   */
  generateSwiftMessage(messageData) {
    const validation = this.validateSwiftMessage(messageData);
    if (!validation.valid) {
      throw new Error(`Message validation failed: ${validation.errors.join(', ')}`);
    }

    const { messageType, senderBIC, receiverBIC, textBlock, priority = 'N' } = messageData;
    
    // Generate Block 1
    const sessionNumber = Date.now().toString().slice(-6);
    const sequenceNumber = '000000';
    const block1 = `{1:F01${senderBIC}${receiverBIC}${sessionNumber}${sequenceNumber}}`;

    // Generate Block 2
    const messageNumber = messageType.replace('MT', '');
    const block2 = `{2:I${messageNumber}${priority}${receiverBIC}}`;

    // Generate Block 3 (optional)
    let block3 = '';
    if (textBlock['108']) {
      block3 = `{3:{108:${textBlock['108']}}}`;
    }

    // Generate Block 4
    let block4 = '{4:\n';
    Object.entries(textBlock).forEach(([tag, value]) => {
      if (tag !== '108' && value) {
        block4 += `:${tag}:${value}\n`;
      }
    });
    block4 += '-}';

    // Generate Block 5
    const checksum = this.generateChecksum(block1 + block2 + block3 + block4);
    const block5 = `{5:{CHK:${checksum}}}`;

    return `${block1}\n${block2}\n${block3}\n${block4}\n${block5}`;
  }

  /**
   * Generate simple checksum for Block 5
   */
  generateChecksum(message) {
    let sum = 0;
    for (let i = 0; i < message.length; i++) {
      sum += message.charCodeAt(i);
    }
    return (sum % 1000000).toString().padStart(6, '0');
  }
}

export default new SwiftValidationService();
