import swiftParser from './swiftParser.js';
import swiftGPIService from './swiftGPIService.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import sanctionsScreeningService from './sanctionsScreeningService.js';
import amlMonitoringService from './amlMonitoringService.js';

class SwiftMessageService {
  constructor() {
    this.messageTypes = {
      'MT103': { name: 'Single Customer Credit Transfer', category: 'payment' },
      'MT202': { name: 'General Financial Institution Transfer', category: 'bank' },
      'MT940': { name: 'Customer Statement Message', category: 'statement' },
      'MT942': { name: 'Interim Transaction Report', category: 'statement' },
      'pacs.008': { name: 'FIToFICustomerCreditTransfer', category: 'payment' },
      'pacs.009': { name: 'FIToFICustomerCreditTransferInitiation', category: 'payment' }
    };
  }

  // Send SWIFT message following proper SWIFT practices
  async sendMessage(messageData) {
    try {
      const {
        messageType,
        senderBIC,
        receiverBIC,
        content,
        priority = 'normal',
        userId,
        amount,
        currency
      } = messageData;

      // Validate message format
      const parsedMessage = await this.validateAndParseMessage(messageType, content);
      
      // Validate BIC codes
      await this.validateBICCodes(senderBIC, receiverBIC);
      
      // Perform sanctions screening
      const screeningResult = await this.performSanctionsScreening({
        senderBIC,
        receiverBIC,
        amount,
        userId
      });
      
      // Perform AML monitoring
      const amlResult = await this.performAMLMonitoring({
        userId,
        amount,
        messageType,
        receiverBIC
      });
      
      // Check if message should be blocked
      if (screeningResult.riskScore >= 80 || amlResult.riskScore >= 80) {
        throw new Error('Message blocked due to compliance concerns');
      }

      // Generate UTR (Unique Transaction Reference)
      const utr = this.generateUTR();
      
      // Add priority to message
      const messageWithPriority = swiftParser.addPriority(parsedMessage, priority);
      
      // Store message in database
      const messageId = await this.storeMessage({
        utr,
        messageType,
        senderBIC,
        receiverBIC,
        content: messageWithPriority,
        priority,
        userId,
        amount,
        currency,
        screeningResult,
        amlResult
      });
      
      // Send to SWIFT network (simulated)
      const sendResult = await this.sendToSwiftNetwork({
        messageId,
        utr,
        message: messageWithPriority,
        priority
      });
      
      // Track with GPI if available
      if (this.messageTypes[messageType]?.category === 'payment') {
        swiftGPIService.trackPayment(utr, messageId);
      }
      
      logger.info('SWIFT message sent successfully', {
        messageId,
        utr,
        messageType,
        senderBIC,
        receiverBIC,
        priority
      });
      
      return {
        success: true,
        messageId,
        utr,
        status: 'sent',
        priority,
        deliveryTime: swiftParser.calculateDeliveryTime(priority),
        screeningResult,
        amlResult
      };
      
    } catch (error) {
      logger.error('Error sending SWIFT message', {
        error: error.message,
        messageData
      });
      throw error;
    }
  }

  // Validate and parse SWIFT message
  async validateAndParseMessage(messageType, content) {
    try {
      let parsedMessage;
      
      if (messageType.startsWith('MT')) {
        parsedMessage = await swiftParser.parseMTMessage(content);
        const validation = swiftParser.validateMTMessage(parsedMessage);
        
        if (!validation.valid) {
          throw new Error(`Invalid MT message format: ${validation.errors.join(', ')}`);
        }
      } else if (messageType.startsWith('pacs.')) {
        parsedMessage = await swiftParser.parseMXMessage(content);
        const validation = swiftParser.validateMXMessage(parsedMessage);
        
        if (!validation.valid) {
          throw new Error(`Invalid MX message format: ${validation.errors.join(', ')}`);
        }
      } else {
        throw new Error(`Unsupported message type: ${messageType}`);
      }
      
      return parsedMessage;
    } catch (error) {
      throw new Error(`Message validation failed: ${error.message}`);
    }
  }

  // Validate BIC codes using GPI directory
  async validateBICCodes(senderBIC, receiverBIC) {
    try {
      // Search sender BIC
      const senderResult = await swiftGPIService.searchBankDirectory(senderBIC);
      if (!senderResult.success || senderResult.data.length === 0) {
        throw new Error(`Invalid sender BIC: ${senderBIC}`);
      }
      
      // Search receiver BIC
      const receiverResult = await swiftGPIService.searchBankDirectory(receiverBIC);
      if (!receiverResult.success || receiverResult.data.length === 0) {
        throw new Error(`Invalid receiver BIC: ${receiverBIC}`);
      }
      
      // Check if both banks are GPI members for payment messages
      const senderBank = senderResult.data[0];
      const receiverBank = receiverResult.data[0];
      
      if (!senderBank.gpiMember || !receiverBank.gpiMember) {
        logger.warn('One or both banks are not GPI members', {
          senderBIC,
          receiverBIC,
          senderGPI: senderBank.gpiMember,
          receiverGPI: receiverBank.gpiMember
        });
      }
      
      return { senderBank, receiverBank };
    } catch (error) {
      throw new Error(`BIC validation failed: ${error.message}`);
    }
  }

  // Perform sanctions screening
  async performSanctionsScreening(partyData) {
    try {
      const screeningResult = await sanctionsScreeningService.screenParty({
        name: partyData.senderBIC,
        type: 'bank',
        country: partyData.senderBIC.substring(4, 6)
      });
      
      // Also screen receiver
      const receiverScreening = await sanctionsScreeningService.screenParty({
        name: partyData.receiverBIC,
        type: 'bank',
        country: partyData.receiverBIC.substring(4, 6)
      });
      
      return {
        senderScreening: screeningResult,
        receiverScreening: receiverScreening,
        riskScore: Math.max(screeningResult.riskScore, receiverScreening.riskScore)
      };
    } catch (error) {
      logger.error('Sanctions screening failed', { error: error.message });
      return { riskScore: 0, error: error.message };
    }
  }

  // Perform AML monitoring
  async performAMLMonitoring(transactionData) {
    try {
      return await amlMonitoringService.monitorTransaction(transactionData);
    } catch (error) {
      logger.error('AML monitoring failed', { error: error.message });
      return { riskScore: 0, error: error.message };
    }
  }

  // Generate Unique Transaction Reference (UTR)
  generateUTR() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SWIFT${timestamp}${random}`;
  }

  // Store message in database
  async storeMessage(messageData) {
    try {
      const result = await query(`
        INSERT INTO messages (
          message_id, utr, message_type, sender_bic, receiver_bic,
          content, priority, created_by, amount, currency,
          screening_result, aml_result, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'sent')
        RETURNING id
      `, [
        messageData.utr,
        messageData.utr,
        messageData.messageType,
        messageData.senderBIC,
        messageData.receiverBIC,
        JSON.stringify(messageData.content),
        messageData.priority,
        messageData.userId,
        messageData.amount,
        messageData.currency,
        JSON.stringify(messageData.screeningResult),
        JSON.stringify(messageData.amlResult)
      ]);
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Error storing message', { error: error.message });
      throw error;
    }
  }

  // Send to SWIFT network (simulated)
  async sendToSwiftNetwork(messageData) {
    try {
      // Simulate SWIFT network sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update message status
      await query(`
        UPDATE messages 
        SET status = 'sent', sent_at = CURRENT_TIMESTAMP
        WHERE message_id = $1
      `, [messageData.messageId]);
      
      // Store in outbound messages for tracking
      await query(`
        INSERT INTO outbound_messages (payment_id, message_content, status, sent_at)
        VALUES ($1, $2, 'sent', CURRENT_TIMESTAMP)
      `, [messageData.utr, JSON.stringify(messageData.message)]);
      
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Error sending to SWIFT network', { error: error.message });
      throw error;
    }
  }

  // Track message status
  async trackMessage(utr) {
    try {
      // Get message from database
      const messageResult = await query(`
        SELECT * FROM messages WHERE utr = $1
      `, [utr]);
      
      if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
      }
      
      const message = messageResult.rows[0];
      
      // Track with GPI
      const gpiResult = await swiftGPIService.trackPayment(utr, message.message_id);
      
      return {
        message,
        gpiTracking: gpiResult,
        status: message.status
      };
    } catch (error) {
      logger.error('Error tracking message', { utr, error: error.message });
      throw error;
    }
  }

  // Get message history
  async getMessageHistory(userId, filters = {}) {
    try {
      let queryStr = `
        SELECT 
          m.*,
          u.email as user_email
        FROM messages m
        LEFT JOIN users u ON m.created_by = u.id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      if (userId) {
        queryStr += ` AND m.created_by = $${paramCount++}`;
        params.push(userId);
      }

      if (filters.messageType) {
        queryStr += ` AND m.message_type = $${paramCount++}`;
        params.push(filters.messageType);
      }

      if (filters.status) {
        queryStr += ` AND m.status = $${paramCount++}`;
        params.push(filters.status);
      }

      if (filters.startDate) {
        queryStr += ` AND m.created_at >= $${paramCount++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        queryStr += ` AND m.created_at <= $${paramCount++}`;
        params.push(filters.endDate);
      }

      queryStr += ' ORDER BY m.created_at DESC';

      if (filters.limit) {
        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting message history', { error: error.message });
      throw error;
    }
  }
}

export default new SwiftMessageService();
