import { Kafka } from 'kafkajs';
import logger from '../config/logger.js';

let kafkaClient = null;
let kafkaProducer = null;
let kafkaConsumer = null;
let isConnected = false;

const initializeKafka = () => {
  try {
    const brokers = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
    
    kafkaClient = new Kafka({
      clientId: 'swiftnexus-server',
      brokers: brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    kafkaProducer = kafkaClient.producer();
    kafkaConsumer = kafkaClient.consumer({ groupId: 'swiftnexus-group' });

    logger.info('Kafka client initialized', { brokers });
  } catch (error) {
    logger.error('Kafka initialization error', { error: error.message });
  }
};

const connectKafka = async () => {
  if (!kafkaClient) {
    initializeKafka();
  }

  try {
    await kafkaProducer.connect();
    await kafkaConsumer.connect();
    isConnected = true;
    logger.info('Kafka connected successfully');
  } catch (error) {
    isConnected = false;
    logger.error('Kafka connection error', { error: error.message });
  }
};

const disconnectKafka = async () => {
  try {
    if (kafkaProducer) await kafkaProducer.disconnect();
    if (kafkaConsumer) await kafkaConsumer.disconnect();
    isConnected = false;
    logger.info('Kafka disconnected');
  } catch (error) {
    logger.error('Kafka disconnect error', { error: error.message });
  }
};

const publishMessage = async (topic, message) => {
  if (!isConnected) {
    await connectKafka();
  }

  try {
    await kafkaProducer.send({
      topic: topic,
      messages: [
        {
          key: message.id || message.message_id,
          value: JSON.stringify(message),
          timestamp: Date.now().toString()
        }
      ]
    });
    logger.debug('Message published to Kafka', { topic, messageId: message.id });
    return true;
  } catch (error) {
    logger.error('Kafka publish error', { error: error.message, topic });
    return false;
  }
};

const subscribeToTopic = async (topic, callback) => {
  if (!isConnected) {
    await connectKafka();
  }

  try {
    await kafkaConsumer.subscribe({ topic, fromBeginning: false });
    
    await kafkaConsumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value.toString());
          await callback(value, { topic, partition, offset: message.offset });
        } catch (error) {
          logger.error('Kafka message processing error', { error: error.message });
        }
      }
    });
    
    logger.info('Subscribed to Kafka topic', { topic });
  } catch (error) {
    logger.error('Kafka subscription error', { error: error.message, topic });
  }
};

const getKafkaStatus = async () => {
  if (!kafkaClient) {
    return {
      status: 'not_configured',
      consumers: 0,
      producers: 0,
      topics: []
    };
  }

  try {
    const admin = kafkaClient.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    await admin.disconnect();

    return {
      status: isConnected ? 'connected' : 'disconnected',
      consumers: kafkaConsumer ? 1 : 0,
      producers: kafkaProducer ? 1 : 0,
      topics: topics
    };
  } catch (error) {
    return {
      status: 'error',
      consumers: 0,
      producers: 0,
      topics: [],
      error: error.message
    };
  }
};

if (process.env.KAFKA_ENABLED === 'true') {
  connectKafka();
}

export default {
  initializeKafka,
  connectKafka,
  disconnectKafka,
  publishMessage,
  subscribeToTopic,
  getKafkaStatus,
  isConnected: () => isConnected
};

