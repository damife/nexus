import messageQueue from './messageQueue.js';
import swiftParser from './swiftParser.js';
import PaymentIdGenerator from './paymentIdGenerator.js';
import { paymentLogger } from '../config/logger.js';
import { query } from '../config/database.js';

class PaymentProcessor {
  constructor() {
    this.queue = messageQueue;
  }

  async processPayment(paymentData) {
    const paymentId = paymentData.messageId || PaymentIdGenerator.generate();
    
    try {
      paymentLogger.logPayment(paymentId, 'received', { type: paymentData.messageType });

      const validationResult = await this.validateMessage(paymentData);
      if (!validationResult.valid) {
        paymentLogger.logValidation(paymentId, false, validationResult.errors);
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      paymentLogger.logValidation(paymentId, true, []);

      let parsedMessage;
      if (paymentData.messageType.startsWith('MT')) {
        parsedMessage = await swiftParser.parseMTMessage(paymentData.rawSwiftText || paymentData.swiftContent);
      } else if (paymentData.messageType.startsWith('pacs') || paymentData.messageType.startsWith('camt')) {
        parsedMessage = await swiftParser.parseMXMessage(paymentData.rawSwiftText || paymentData.swiftContent);
      }

      const queued = await this.queue.publish(
        this.queue.queues.PAYMENT_PROCESSING,
        {
          paymentId,
          messageType: paymentData.messageType,
          parsedMessage,
          originalData: paymentData
        }
      );

      if (queued) {
        paymentLogger.logQueue(paymentId, 'payment.processing', 'queued');
      }

      await this.savePaymentToDatabase(paymentId, paymentData, parsedMessage);

      return {
        success: true,
        paymentId,
        status: 'queued',
        message: 'Payment queued for processing'
      };

    } catch (error) {
      paymentLogger.logError(paymentId, error, { step: 'processPayment' });
      throw error;
    }
  }

  async validateMessage(paymentData) {
    const errors = [];

    if (!paymentData.messageType) {
      errors.push('Message type is required');
    }

    if (!paymentData.senderBIC || paymentData.senderBIC.length < 8) {
      errors.push('Invalid sender BIC');
    }

    if (!paymentData.receiverBIC || paymentData.receiverBIC.length < 8) {
      errors.push('Invalid receiver BIC');
    }

    if (paymentData.messageType.startsWith('MT')) {
      if (!paymentData.rawSwiftText && !paymentData.swiftContent) {
        errors.push('MT message requires raw SWIFT text');
      } else {
        try {
          const parsed = await swiftParser.parseMTMessage(paymentData.rawSwiftText || paymentData.swiftContent);
          const validation = swiftParser.validateMTMessage(parsed);
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        } catch (error) {
          errors.push(`MT parsing error: ${error.message}`);
        }
      }
    } else if (paymentData.messageType.startsWith('pacs') || paymentData.messageType.startsWith('camt')) {
      if (!paymentData.rawSwiftText && !paymentData.swiftContent) {
        errors.push('MX message requires XML content');
      } else {
        try {
          const parsed = await swiftParser.parseMXMessage(paymentData.rawSwiftText || paymentData.swiftContent);
          const validation = swiftParser.validateMXMessage(parsed);
          if (!validation.valid) {
            errors.push(...validation.errors);
          }
        } catch (error) {
          errors.push(`MX parsing error: ${error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async transformMessage(paymentId, fromFormat, toFormat, messageData) {
    try {
      paymentLogger.logTransformation(paymentId, fromFormat, toFormat, false);

      let transformedMessage;

      if (fromFormat.startsWith('MT') && toFormat.startsWith('pacs')) {
        transformedMessage = await this.convertMTtoMX(messageData);
      } else if (fromFormat.startsWith('pacs') && toFormat.startsWith('MT')) {
        transformedMessage = await this.convertMXtoMT(messageData);
      } else {
        throw new Error(`Unsupported transformation: ${fromFormat} to ${toFormat}`);
      }

      paymentLogger.logTransformation(paymentId, fromFormat, toFormat, true);

      return {
        success: true,
        transformedMessage,
        format: toFormat
      };

    } catch (error) {
      paymentLogger.logError(paymentId, error, { step: 'transformMessage' });
      throw error;
    }
  }

  async convertMTtoMX(mtData) {
    const parsedMT = swiftParser.parseMTMessage(mtData.rawSwiftText || mtData.swiftContent);
    
    return {
      Document: {
        $: { xmlns: 'urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08' },
        FIToFICstmrCdtTrf: {
          GrpHdr: {
            MsgId: parsedMT.block4?.['20'] || 'REF123',
            CreDtTm: new Date().toISOString(),
            NbOfTxs: '1'
          },
          CdtTrfTxInf: {
            PmtId: {
              InstrId: parsedMT.block4?.['20'] || 'REF123',
              EndToEndId: parsedMT.block4?.['20'] || 'REF123'
            },
            IntrBkSttlmAmt: {
              $: { Ccy: parsedMT.block4?.['32A']?.substring(3, 6) || 'USD' },
              _: parsedMT.block4?.['32A']?.substring(7) || '0'
            }
          }
        }
      }
    };
  }

  async convertMXtoMT(mxData) {
    const parsedMX = await swiftParser.parseMXMessage(mxData.rawSwiftText || mxData.swiftContent);
    
    const block4 = `:20:${parsedMX.Document?.FIToFICstmrCdtTrf?.GrpHdr?.MsgId || 'REF'}\n`;
    
    return {
      block1: 'F01SENDERBICRECEIVERBIC241231123456',
      block2: 'I103SENDERBICN',
      block3: '{108:REF123}',
      block4: `{4:\n${block4}-}`,
      block5: '{5:{CHK:123456}}'
    };
  }

  async savePaymentToDatabase(paymentId, paymentData, parsedMessage) {
    try {
      await query(`
        INSERT INTO messages (
          message_id, message_type, category, reference, status,
          sender_bic, receiver_bic, amount, currency, value_date,
          form_data, swift_content, raw_swift_text, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (message_id) DO UPDATE SET
          updated_at = CURRENT_TIMESTAMP
      `, [
        paymentId,
        paymentData.messageType,
        paymentData.category || 'mt',
        paymentData.reference,
        'pending',
        paymentData.senderBIC,
        paymentData.receiverBIC,
        paymentData.amount,
        paymentData.currency,
        paymentData.valueDate,
        JSON.stringify(paymentData.formData || {}),
        paymentData.swiftContent,
        paymentData.rawSwiftText,
        paymentData.createdBy || null
      ]);
    } catch (error) {
      paymentLogger.logError(paymentId, error, { step: 'savePaymentToDatabase' });
      throw error;
    }
  }
}

export default new PaymentProcessor();
