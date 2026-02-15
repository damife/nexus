import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Worker Thread for Processing Multiple Messages
 * Handles CPU-intensive operations like message parsing, transformation, and validation
 */
if (!isMainThread) {
  // Worker thread code
  const { messageData, operation } = workerData;

  (async () => {
    try {
      let result;

      switch (operation) {
        case 'parseMT':
          // Dynamic import to avoid circular dependencies
          const { default: swiftParser } = await import('../services/swiftParser.js');
          result = await swiftParser.parseMTMessage(messageData.rawSwiftText || messageData.swiftContent);
          break;

        case 'parseMX':
          const { default: swiftParser: mxParser } = await import('../services/swiftParser.js');
          result = await mxParser.parseMXMessage(messageData.rawSwiftText || messageData.swiftContent);
          break;

        case 'transformMTtoMX':
          const { default: paymentProcessor } = await import('../services/paymentProcessor.js');
          result = await paymentProcessor.convertMTtoMX(messageData);
          break;

        case 'transformMXtoMT':
          const { default: paymentProcessor: mxProcessor } = await import('../services/paymentProcessor.js');
          result = await mxProcessor.convertMXtoMT(messageData);
          break;

        case 'validate':
          const { default: paymentProcessor: validator } = await import('../services/paymentProcessor.js');
          result = await validator.validateMessage(messageData);
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      parentPort.postMessage({ success: true, result });
    } catch (error) {
      parentPort.postMessage({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      });
    }
  })();
}

/**
 * Create and manage worker threads for message processing
 */
export class MessageWorker {
  constructor() {
    this.workers = new Map();
    this.workerScript = new URL(import.meta.url).pathname;
  }

  /**
   * Process message in worker thread
   */
  async processInWorker(messageData, operation = 'parseMT') {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerScript, {
        workerData: { messageData, operation }
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Worker timeout'));
      }, 30000); // 30 second timeout

      worker.on('message', (result) => {
        clearTimeout(timeout);
        worker.terminate();
        if (result.success) {
          resolve(result.result);
        } else {
          reject(new Error(result.error));
        }
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Process multiple messages in parallel using worker pool
   */
  async processBatch(messages, operation = 'parseMT', maxWorkers = 4) {
    const results = [];
    const batches = [];

    // Split messages into batches
    for (let i = 0; i < messages.length; i += maxWorkers) {
      batches.push(messages.slice(i, i + maxWorkers));
    }

    // Process each batch
    for (const batch of batches) {
      const batchPromises = batch.map(message => 
        this.processInWorker(message, operation).catch(error => ({
          error: error.message,
          messageId: message.messageId || message.id
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }
}

export default new MessageWorker();

