/**
 * SWIFT Message Generator for SwiftNexus Enterprise
 * Industry Standard SWIFT MT Messages
 */

class SwiftMessageGenerator {
  constructor() {
    this.messageTypes = {
      // Customer Transfer
      'MT103': 'Single Customer Credit Transfer',
      'MT202': 'General Financial Institution Transfer',
      
      // Bank Transfer
      'MT101': 'General Financial Institution Transfer',
      'MT102': 'General Financial Institution Transfer',
      
      // Foreign Exchange
      'MT300': 'Foreign Exchange Confirmation',
      'MT320': 'Fixed/Variable Loan Confirmation',
      
      // Securities
      'MT541': 'Receive Free of Payment',
      'MT542': 'Receive Against Payment',
      
      // Cash Management
      'MT910': 'Confirmation of Debit',
      'MT940': 'Customer Statement Message',
      'MT950': 'Statement Message',
      
      // Trade Services
      'MT700': 'Issue of a Documentary Credit',
      'MT710': 'Advice of a Documentary Credit',
      
      // Common Group
      'MT199': 'Free Format Message',
      'MT799': 'Free Format Message'
    };

    this.priorityCodes = {
      'N': 'Normal',
      'U': 'Urgent',
      'S': 'System'
    };
  }

  /**
   * Generate Basic Header Block (Block 1)
   * Format: {1:F<application_id><service_id><logical_terminal><session_number><sequence_number>}
   */
  generateBasicHeader(senderBIC, sessionNumber = '2456', sequenceNumber = '1') {
    const applicationId = 'F'; // FIN
    const serviceId = '01';   // GPA
    const logicalTerminal = senderBIC + 'XXX'; // XXX for live
    
    return `{1:${applicationId}${serviceId}${logicalTerminal}${sessionNumber}${sequenceNumber}}`;
  }

  /**
   * Generate Application Header Block (Block 2)
   * Format: {2:<message_type><receiver_address><priority>}
   */
  generateApplicationHeader(messageType, receiverBIC, priority = 'N') {
    if (!this.messageTypes[messageType]) {
      throw new Error(`Invalid message type: ${messageType}`);
    }
    
    if (!this.priorityCodes[priority]) {
      throw new Error(`Invalid priority code: ${priority}`);
    }

    const receiverAddress = receiverBIC + 'XXXX';
    return `{2:${messageType}${receiverAddress}${priority}}`;
  }

  /**
   * Generate User Header Block (Block 3) - Optional
   * Format: {3:{108:<bank_priority_code>}{121:<UETR>}}
   */
  generateUserHeader(bankPriorityCode = '', uetr = '') {
    let userHeader = '{3:';
    const blocks = [];
    
    if (bankPriorityCode) {
      blocks.push(`{108:${bankPriorityCode}}`);
    }
    
    if (uetr) {
      blocks.push(`{121:${uetr}}`);
    }
    
    if (blocks.length > 0) {
      userHeader += blocks.join('');
    }
    
    userHeader += '}';
    return userHeader;
  }

  /**
   * Generate Text Block (Block 4) - Mandatory
   * Contains the actual message content
   */
  generateTextBlock(fields) {
    let textBlock = '{4:\n';
    
    // Add fields in SWIFT format
    Object.entries(fields).forEach(([tag, value]) => {
      if (value) {
        textBlock += `:${tag}:${value}\n`;
      }
    });
    
    textBlock += '-}';
    return textBlock;
  }

  /**
   * Generate Trailer Block (Block 5)
   * Format: {5:{MAC:<mac>}{CHK:<checksum>}}
   */
  generateTrailer(mac = '', checksum = '') {
    let trailer = '{5:';
    const blocks = [];
    
    if (mac) {
      blocks.push(`{MAC:${mac}}`);
    }
    
    if (checksum) {
      blocks.push(`{CHK:${checksum}}`);
    }
    
    if (blocks.length > 0) {
      trailer += blocks.join('');
    }
    
    trailer += '}';
    return trailer;
  }

  /**
   * Generate complete SWIFT MT103 message (Customer Credit Transfer)
   */
  generateMT103(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      relatedReference,
      date,
      currency,
      amount,
      orderingCustomer,
      beneficiaryCustomer,
      beneficiaryBank,
      paymentDetails,
      charges = 'SHA',
      senderToReceiverInfo = ''
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT103', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '21': relatedReference,
      '13C': date, // Date/Time Indication
      '32A': `${currency}${amount}`,
      '50A': orderingCustomer,
      '59': beneficiaryCustomer,
      '57A': beneficiaryBank,
      '70': paymentDetails,
      '71A': charges,
      '72': senderToReceiverInfo
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate complete SWIFT MT199 message (Free Format)
   */
  generateMT199(options) {
    const {
      senderBIC,
      receiverBIC,
      transactionReference,
      messageContent,
      priority = 'N'
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT199', receiverBIC, priority);
    const userHeader = this.generateUserHeader();
    
    const textFields = {
      '20': transactionReference,
      '79': messageContent
    };
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate complete SWIFT MT940 message (Customer Statement)
   */
  generateMT940(options) {
    const {
      senderBIC,
      receiverBIC,
      accountNumber,
      statementNumber,
      openingBalance,
      closingBalance,
      transactions = []
    } = options;

    const basicHeader = this.generateBasicHeader(senderBIC);
    const applicationHeader = this.generateApplicationHeader('MT940', receiverBIC);
    const userHeader = this.generateUserHeader();
    
    let textFields = {
      '20': accountNumber,
      '25': statementNumber,
      '60F': openingBalance, // Opening Balance
      '62F': closingBalance  // Closing Balance
    };
    
    // Add transactions
    transactions.forEach((transaction, index) => {
      const tag = index % 2 === 0 ? '61' : '86';
      textFields[tag] = transaction;
    });
    
    const textBlock = this.generateTextBlock(textFields);
    const trailer = this.generateTrailer();

    return `${basicHeader}\n${applicationHeader}\n${userHeader}\n${textBlock}\n${trailer}`;
  }

  /**
   * Generate UETR (Unique End-to-End Transaction Reference)
   * Format: UUID v4 compliant
   */
  generateUETR() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate SWIFT message format
   */
  validateSwiftMessage(message) {
    const errors = [];
    
    // Check basic structure
    if (!message.includes('{1:')) {
      errors.push('Missing Basic Header Block (Block 1)');
    }
    
    if (!message.includes('{2:')) {
      errors.push('Missing Application Header Block (Block 2)');
    }
    
    if (!message.includes('{4:')) {
      errors.push('Missing Text Block (Block 4)');
    }
    
    if (!message.includes('{5:')) {
      errors.push('Missing Trailer Block (Block 5)');
    }
    
    // Check message type in Block 2
    const block2Match = message.match(/\{2:(I\d{3}|[A-Z]\d{3})/);
    if (!block2Match) {
      errors.push('Invalid or missing message type in Block 2');
    } else {
      const messageType = block2Match[1];
      if (!this.messageTypes[messageType]) {
        errors.push(`Unknown message type: ${messageType}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      messageType: block2Match ? block2Match[1] : null
    };
  }

  /**
   * Parse SWIFT message
   */
  parseSwiftMessage(message) {
    const parsed = {
      blocks: {},
      fields: {},
      messageType: null
    };
    
    // Extract blocks
    const blockMatches = message.match(/\{(\d):([^}]*)\}/g);
    if (blockMatches) {
      blockMatches.forEach(block => {
        const blockMatch = block.match(/\{(\d):([^}]*)\}/);
        if (blockMatch) {
          const blockNumber = blockMatch[1];
          const blockContent = blockMatch[2];
          parsed.blocks[blockNumber] = blockContent;
        }
      });
    }
    
    // Extract fields from Block 4
    if (parsed.blocks['4']) {
      const fieldMatches = parsed.blocks['4'].match(/:(\d{2,3}):([^\n]*)/g);
      if (fieldMatches) {
        fieldMatches.forEach(field => {
          const fieldMatch = field.match(/:(\d{2,3}):([^\n]*)/);
          if (fieldMatch) {
            const fieldTag = fieldMatch[1];
            const fieldValue = fieldMatch[2];
            parsed.fields[fieldTag] = fieldValue;
          }
        });
      }
    }
    
    // Extract message type from Block 2
    if (parsed.blocks['2']) {
      const messageTypeMatch = parsed.blocks['2'].match(/(I\d{3}|[A-Z]\d{3})/);
      if (messageTypeMatch) {
        parsed.messageType = messageTypeMatch[1];
      }
    }
    
    return parsed;
  }
}

export default SwiftMessageGenerator;
