import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import messageQueue from '../services/messageQueue.js';
import kafkaService from '../services/kafkaService.js';
import logger from '../config/logger.js';
import os from 'os';

const router = express.Router();

/**
 * Comprehensive Monitoring Endpoint
 * Returns health status of all system components
 */
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const startTime = Date.now();
    
    let dbStatus = { status: 'unknown', latency: 0, connections: 0 };
    try {
      const dbStart = Date.now();
      const result = await query('SELECT 1');
      const connResult = await query('SELECT count(*) as count FROM pg_stat_activity WHERE state = $1', ['active']);
      dbStatus = {
        status: 'connected',
        latency: Date.now() - dbStart,
        connections: parseInt(connResult.rows[0]?.count || 0)
      };
    } catch (error) {
      dbStatus = {
        status: 'disconnected',
        latency: 0,
        connections: 0,
        error: error.message
      };
    }

    const queueStatus = {
      status: messageQueue.connection ? 'connected' : 'disconnected',
      queues: 0,
      messages: 0
    };

    if (messageQueue.channel) {
      try {
        let totalMessages = 0;
        for (const queueName of Object.values(messageQueue.queues)) {
          const stats = await messageQueue.getQueueStats(queueName);
          totalMessages += stats.messageCount || 0;
        }
        queueStatus.queues = Object.keys(messageQueue.queues).length;
        queueStatus.messages = totalMessages;
      } catch (error) {
        queueStatus.error = error.message;
      }
    }

    const systemStatus = {
      cpu: Math.round((1 - os.loadavg()[0] / os.cpus().length) * 100),
      memory: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      disk: 0
    };

    const processingStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('sent', 'completed', 'ack')) as success,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM messages
    `);

    const stats = processingStats.rows[0] || {};

    const response = {
      api: {
        status: 'healthy',
        latency: Date.now() - startTime,
        uptime: Math.round((process.uptime() / 3600) * 100) / 100
      },
      database: dbStatus,
      kafka: await kafkaService.getKafkaStatus(),
      rabbitmq: queueStatus,
      system: systemStatus,
      processing: {
        total: parseInt(stats.total || 0),
        success: parseInt(stats.success || 0),
        failed: parseInt(stats.failed || 0),
        pending: parseInt(stats.pending || 0)
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Monitoring error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monitoring data'
    });
  }
});

router.get('/status', authenticate, async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    let dbStatus = { status: 'unknown', latency: 0 };
    try {
      const dbStart = Date.now();
      await query('SELECT 1');
      dbStatus = {
        status: 'connected',
        latency: Date.now() - dbStart
      };
    } catch (error) {
      dbStatus = {
        status: 'disconnected',
        error: error.message
      };
    }

    // Check message queue
    const queueStatus = {
      status: messageQueue.connection ? 'connected' : 'disconnected',
      queues: {}
    };

    if (messageQueue.channel) {
      try {
        for (const queueName of Object.values(messageQueue.queues)) {
          const stats = await messageQueue.getQueueStats(queueName);
          queueStatus.queues[queueName] = stats;
        }
      } catch (error) {
        queueStatus.error = error.message;
      }
    }

    // System resources
    const systemStatus = {
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100, // GB
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100)
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      uptime: Math.round(process.uptime())
    };

    // Get processing statistics
    const processingStats = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'authorized') as authorized,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as last_hour
      FROM messages
    `);

    const stats = processingStats.rows[0] || {};

    // Overall health
    const overallHealth = 
      dbStatus.status === 'connected' &&
      queueStatus.status === 'connected' &&
      systemStatus.memory.usagePercent < 90
        ? 'healthy'
        : 'degraded';

    const response = {
      success: true,
      status: overallHealth,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      components: {
        api: {
          status: 'healthy',
          uptime: systemStatus.uptime,
          version: process.env.npm_package_version || '1.0.0'
        },
        database: dbStatus,
        messageQueue: queueStatus,
        system: systemStatus,
        processing: {
          pending: parseInt(stats.pending || 0),
          authorized: parseInt(stats.authorized || 0),
          sent: parseInt(stats.sent || 0),
          failed: parseInt(stats.failed || 0),
          lastHour: parseInt(stats.last_hour || 0)
        }
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Monitoring status error', { error: error.message });
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to retrieve monitoring status'
    });
  }
});

/**
 * Queue Health Check
 */
router.get('/queues', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const queueStats = {};

    if (messageQueue.channel) {
      for (const [key, queueName] of Object.entries(messageQueue.queues)) {
        const stats = await messageQueue.getQueueStats(queueName);
        queueStats[key] = {
          name: queueName,
          ...stats
        };
      }
    }

    res.json({
      success: true,
      queues: queueStats,
      connected: !!messageQueue.connection
    });
  } catch (error) {
    logger.error('Queue health check error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error retrieving queue stats' });
  }
});

export default router;

