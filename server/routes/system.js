import express from 'express';
import os from 'os';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * Get comprehensive system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      server: await getServerStatus(),
      database: await getDatabaseStatus(),
      services: await getServicesStatus(),
      resources: getSystemResources(),
      health: 'healthy'
    };

    // Determine overall health
    if (!status.database.connected || !status.server.running) {
      status.health = 'critical';
    } else if (status.resources.memory.usagePercent > 90 || status.resources.cpu.loadAverage[0] > 80) {
      status.health = 'warning';
    }

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error getting system status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error.message
    });
  }
});

/**
 * Get server status
 */
router.get('/server', async (req, res) => {
  try {
    const serverStatus = await getServerStatus();
    res.json({
      success: true,
      server: serverStatus
    });
  } catch (error) {
    logger.error('Error getting server status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get server status'
    });
  }
});

/**
 * Get database status
 */
router.get('/database', async (req, res) => {
  try {
    const dbStatus = await getDatabaseStatus();
    res.json({
      success: true,
      database: dbStatus
    });
  } catch (error) {
    logger.error('Error getting database status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get database status'
    });
  }
});

/**
 * Get services status
 */
router.get('/services', async (req, res) => {
  try {
    const servicesStatus = await getServicesStatus();
    res.json({
      success: true,
      services: servicesStatus
    });
  } catch (error) {
    logger.error('Error getting services status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get services status'
    });
  }
});

/**
 * Get system resources
 */
router.get('/resources', (req, res) => {
  try {
    const resources = getSystemResources();
    res.json({
      success: true,
      resources
    });
  } catch (error) {
    logger.error('Error getting system resources', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get system resources'
    });
  }
});

/**
 * Get recent logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { type = 'combined', lines = 100 } = req.query;
    const logs = await getRecentLogs(type, parseInt(lines));

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    logger.error('Error getting logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

/**
 * Get system statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await getSystemStatistics();
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    logger.error('Error getting statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * Get environment configuration (sanitized)
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '5000',
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '5432',
        name: process.env.DB_NAME || 'swiftnexus',
        ssl: process.env.DB_SSL === 'true'
      },
      features: {
        cryptoDeposits: !!process.env.NOWPAYMENTS_API_KEY,
        emailService: !!process.env.SMTP_HOST,
        messageQueue: !!process.env.RABBITMQ_URL,
        kafkaStreaming: !!process.env.KAFKA_BROKERS
      },
      urls: {
        app: process.env.APP_URL || 'http://localhost:3000',
        cors: process.env.CORS_ORIGIN || 'http://localhost:3000'
      }
    };

    res.json({
      success: true,
      config
    });
  } catch (error) {
    logger.error('Error getting config', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get server status information
 */
async function getServerStatus() {
  const uptime = process.uptime();
  const memory = process.memoryUsage();

  return {
    running: true,
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    nodeVersion: process.version,
    platform: process.platform,
    pid: process.pid,
    memory: {
      rss: formatBytes(memory.rss),
      heapTotal: formatBytes(memory.heapTotal),
      heapUsed: formatBytes(memory.heapUsed),
      external: formatBytes(memory.external)
    },
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * Get database status
 */
async function getDatabaseStatus() {
  try {
    // Test connection
    const startTime = Date.now();
    await query('SELECT 1 as test');
    const responseTime = Date.now() - startTime;

    // Get database info
    const versionResult = await query('SELECT version()');
    const sizeResult = await query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const connectionsResult = await query(`
      SELECT count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);
    const tablesResult = await query(`
      SELECT count(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    return {
      connected: true,
      responseTime: `${responseTime}ms`,
      version: versionResult.rows[0].version.split(',')[0],
      size: sizeResult.rows[0].size,
      activeConnections: parseInt(connectionsResult.rows[0].count),
      tables: parseInt(tablesResult.rows[0].count),
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'swiftnexus'
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'swiftnexus'
    };
  }
}

/**
 * Get services status
 */
async function getServicesStatus() {
  const services = {};

  // Check crypto payments service
  services.cryptoPayments = {
    enabled: !!process.env.NOWPAYMENTS_API_KEY,
    configured: !!(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET),
    status: process.env.NOWPAYMENTS_API_KEY ? 'available' : 'disabled'
  };

  // Check email service
  services.email = {
    enabled: !!process.env.SMTP_HOST,
    configured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    status: process.env.SMTP_HOST ? 'available' : 'disabled',
    provider: process.env.SMTP_HOST || 'not configured'
  };

  // Check message queue
  services.messageQueue = {
    enabled: !!process.env.RABBITMQ_URL,
    configured: !!process.env.RABBITMQ_URL,
    status: process.env.RABBITMQ_URL ? 'unknown' : 'disabled',
    url: process.env.RABBITMQ_URL ? 'configured' : 'not configured'
  };

  // Check Kafka
  services.kafka = {
    enabled: !!process.env.KAFKA_BROKERS,
    configured: !!process.env.KAFKA_BROKERS,
    status: process.env.KAFKA_BROKERS ? 'unknown' : 'disabled',
    brokers: process.env.KAFKA_BROKERS || 'not configured'
  };

  return services;
}

/**
 * Get system resources
 */
function getSystemResources() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    cpu: {
      model: os.cpus()[0].model,
      cores: os.cpus().length,
      loadAverage: os.loadavg().map(load => (load * 100 / os.cpus().length).toFixed(2))
    },
    memory: {
      total: formatBytes(totalMemory),
      used: formatBytes(usedMemory),
      free: formatBytes(freeMemory),
      usagePercent: ((usedMemory / totalMemory) * 100).toFixed(2)
    },
    disk: {
      // Note: Getting disk info requires additional packages
      // This is a placeholder for now
      status: 'available'
    },
    network: {
      hostname: os.hostname(),
      interfaces: Object.keys(os.networkInterfaces()).length
    }
  };
}

/**
 * Get recent logs
 */
async function getRecentLogs(type, lines) {
  try {
    const logDir = path.join(__dirname, '../../logs');
    let logFile = 'combined.log';

    if (type === 'error') {
      logFile = 'error.log';
    } else if (type === 'access') {
      logFile = 'access.log';
    }

    const logPath = path.join(logDir, logFile);

    try {
      const content = await fs.readFile(logPath, 'utf8');
      const logLines = content.trim().split('\n');
      const recentLogs = logLines.slice(-lines);

      return {
        type,
        count: recentLogs.length,
        logs: recentLogs.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line };
          }
        })
      };
    } catch (error) {
      return {
        type,
        count: 0,
        logs: [],
        error: 'Log file not found or empty'
      };
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Get system statistics
 */
async function getSystemStatistics() {
  try {
    // Get user statistics
    const usersResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_today
      FROM users
    `);

    // Get payment statistics
    const paymentsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'finished') as completed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today
      FROM crypto_payments
    `);

    // Get message statistics
    const messagesResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as today
      FROM messages
    `);

    return {
      users: usersResult.rows[0],
      payments: paymentsResult.rows[0],
      messages: messagesResult.rows[0],
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error getting statistics', { error: error.message });
    return {
      users: { total: 0, active: 0, new_today: 0 },
      payments: { total: 0, completed: 0, today: 0 },
      messages: { total: 0, today: 0 },
      error: 'Unable to fetch statistics'
    };
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format uptime to human readable
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;
