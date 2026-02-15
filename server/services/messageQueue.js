import amqp from 'amqplib';
import logger from '../config/logger.js';

class MessageQueue {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.queues = {
      PAYMENT_PROCESSING: 'payment.processing',
      PAYMENT_VALIDATION: 'payment.validation',
      PAYMENT_TRANSFORMATION: 'payment.transformation',
      PAYMENT_OUTBOUND: 'payment.outbound',
      SANCTIONS_SCREENING: 'payment.sanctions',
      HIGH_VALUE: 'payment.highvalue'
    };
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Declare all queues with durability
      for (const queueName of Object.values(this.queues)) {
        await this.channel.assertQueue(queueName, {
          durable: true, // Queue survives broker restart
          arguments: {
            'x-message-ttl': 86400000 // 24 hours TTL
          }
        });
      }
      
      logger.info('Message queue connected successfully');
      return true;
    } catch (error) {
      logger.error('Failed to connect to message queue', { error: error.message });
      // Fallback: continue without queue (for development)
      logger.warn('Continuing without message queue - messages will be processed synchronously');
      return false;
    }
  }

  async publish(queueName, message, options = {}) {
    if (!this.channel) {
      logger.warn('Queue not available, processing message synchronously');
      return false;
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
        messageId: message.messageId || `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      }));

      const published = this.channel.sendToQueue(
        queueName,
        messageBuffer,
        {
          persistent: true, // Message survives broker restart
          ...options
        }
      );

      if (published) {
        logger.info('Message published to queue', { queueName, messageId: message.messageId });
        return true;
      } else {
        logger.warn('Failed to publish message - queue may be full');
        return false;
      }
    } catch (error) {
      logger.error('Error publishing message', { queueName, error: error.message });
      return false;
    }
  }

  async consume(queueName, callback, options = {}) {
    if (!this.channel) {
      return false;
    }

    try {
      await this.channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              await callback(content);
              this.channel.ack(msg); // Acknowledge successful processing
            } catch (error) {
              logger.error('Error processing message', { queueName, error: error.message });
              // Reject and requeue for retry
              this.channel.nack(msg, false, true);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
          ...options
        }
      );

      logger.info('Started consuming from queue', { queueName });
      return true;
    } catch (error) {
      logger.error('Error setting up consumer', { queueName, error: error.message });
      return false;
    }
  }

  async getQueueStats(queueName) {
    if (!this.channel) {
      return { size: 0, consumers: 0 };
    }

    try {
      const queueInfo = await this.channel.checkQueue(queueName);
      return {
        size: queueInfo.messageCount,
        consumers: queueInfo.consumerCount
      };
    } catch (error) {
      logger.error('Error getting queue stats', { queueName, error: error.message });
      return { size: 0, consumers: 0 };
    }
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    logger.info('Message queue connection closed');
  }
}

// Singleton instance
const messageQueue = new MessageQueue();

export default messageQueue;

