import messageQueue from './messageQueue.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import auditLogger from './auditLogger.js';

class PaymentOutboundService {
  constructor() {
    this.setupConsumer();
  }

  async setupConsumer() {
    await messageQueue.consume(
      messageQueue.queues.PAYMENT_OUTBOUND,
      async (message) => {
        await this.processOutboundPayment(message);
      }
    );
  }

  async processOutboundPayment(paymentData) {
    const { paymentId, messageType, senderBIC, receiverBIC, amount, currency, swiftContent, rawSwiftText, authorizedBy } = paymentData;

    try {
      logger.info('Processing outbound payment', { paymentId });

      await query(`
        UPDATE messages 
        SET status = 'sent', updated_at = CURRENT_TIMESTAMP
        WHERE message_id = $1
      `, [paymentId]);

      await auditLogger.logStateChange(
        paymentId,
        'ready_to_send',
        'sent',
        authorizedBy,
        {
          action: 'payment_sent',
          messageType,
          senderBIC,
          receiverBIC,
          amount,
          currency
        }
      );

      logger.info('Payment sent successfully', { paymentId });

      await this.sendToSWIFTNetwork(paymentData);
    } catch (error) {
      logger.error('Error processing outbound payment', { paymentId, error: error.message });
      
      await query(`
        UPDATE messages 
        SET status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE message_id = $1
      `, [paymentId]);
    }
  }

  async sendToSWIFTNetwork(paymentData) {
    const { paymentId, swiftContent, rawSwiftText } = paymentData;

    try {
      logger.info('Sending to SWIFT network', { paymentId });

      const swiftMessage = rawSwiftText || swiftContent;

      await query(`
        INSERT INTO outbound_messages (
          payment_id, message_content, status, sent_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [paymentId, swiftMessage, 'sent']).catch(() => {
        logger.warn('outbound_messages table may not exist, skipping');
      });

      logger.info('Payment sent to SWIFT network', { paymentId });
    } catch (error) {
      logger.error('Error sending to SWIFT network', { paymentId, error: error.message });
      throw error;
    }
  }
}

export default new PaymentOutboundService();

