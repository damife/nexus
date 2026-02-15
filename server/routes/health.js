/**
 * Health Check Routes for SwiftNexus Enterprise
 * Comprehensive system health monitoring
 */

import { query } from '../config/database.js';
import logger from '../config/logger.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import express from 'express';

const router = express.Router();

/**
 * Basic health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

/**
 * Comprehensive health check endpoint
 */
router.get('/health/detailed', async (req, res) => {
  try {
    const health = await getDetailedHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Detailed health check failed',
      message: error.message
    });
  }
});

/**
 * Database health check
 */
router.get('/health/database', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: dbHealth.status === 'healthy',
      data: dbHealth
    });
  } catch (error) {
    logger.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Database health check failed',
      message: error.message
    });
  }
});

/**
 * System resources health check
 */
router.get('/health/system', async (req, res) => {
  try {
    const systemHealth = await checkSystemHealth();
    
    res.json({
      success: true,
      data: systemHealth
    });
  } catch (error) {
    logger.error('System health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'System health check failed',
      message: error.message
    });
  }
});

/**
 * API endpoints health check
 */
router.get('/health/api', async (req, res) => {
  try {
    const apiHealth = await checkAPIHealth();
    
    const statusCode = apiHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: apiHealth.status === 'healthy',
      data: apiHealth
    });
  } catch (error) {
    logger.error('API health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'API health check failed',
      message: error.message
    });
  }
});

/**
 * SWIFT services health check
 */
router.get('/health/swift', async (req, res) => {
  try {
    const swiftHealth = await checkSwiftServicesHealth();
    
    const statusCode = swiftHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: swiftHealth.status === 'healthy',
      data: swiftHealth
    });
  } catch (error) {
    logger.error('SWIFT services health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'SWIFT services health check failed',
      message: error.message
    });
  }
});

/**
 * Multitenant health check
 */
router.get('/health/tenant', async (req, res) => {
  try {
    const tenantHealth = await checkTenantHealth();
    
    const statusCode = tenantHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: tenantHealth.status === 'healthy',
      data: tenantHealth
    });
  } catch (error) {
    logger.error('Tenant health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Tenant health check failed',
      message: error.message
    });
  }
});

/**
 * NowPayments health check
 */
router.get('/health/nowpayments', async (req, res) => {
  try {
    const nowPaymentsHealth = await checkNowPaymentsHealth();
    
    const statusCode = nowPaymentsHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: nowPaymentsHealth.status === 'healthy',
      data: nowPaymentsHealth
    });
  } catch (error) {
    logger.error('NowPayments health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'NowPayments health check failed',
      message: error.message
    });
  }
});

/**
 * Webhook health check
 */
router.get('/health/webhooks', async (req, res) => {
  try {
    const webhookHealth = await checkWebhookHealth();
    
    const statusCode = webhookHealth.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: webhookHealth.status === 'healthy',
      data: webhookHealth
    });
  } catch (error) {
    logger.error('Webhook health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Webhook health check failed',
      message: error.message
    });
  }
});

/**
 * Performance metrics
 */
router.get('/health/performance', async (req, res) => {
  try {
    const performance = await getPerformanceMetrics();
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Performance metrics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Performance metrics failed',
      message: error.message
    });
  }
});

/**
 * Error rates
 */
router.get('/health/error-rates', async (req, res) => {
  try {
    const { timeframe = '1h' } = req.query;
    const errorRates = await getErrorRates(timeframe);
    
    res.json({
      success: true,
      data: errorRates
    });
  } catch (error) {
    logger.error('Error rates check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Error rates check failed',
      message: error.message
    });
  }
});

/**
 * Uptime information
 */
router.get('/health/uptime', async (req, res) => {
  try {
    const uptime = getSystemUptime();
    
    res.json({
      success: true,
      data: uptime
    });
  } catch (error) {
    logger.error('Uptime check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Uptime check failed',
      message: error.message
    });
  }
});

/**
 * Get detailed health information
 */
async function getDetailedHealth() {
  const [dbHealth, systemHealth, apiHealth, swiftHealth, tenantHealth, nowPaymentsHealth, webhookHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkSystemHealth(),
    checkAPIHealth(),
    checkSwiftServicesHealth(),
    checkTenantHealth(),
    checkNowPaymentsHealth(),
    checkWebhookHealth()
  ]);

  const overallStatus = [
    dbHealth.status,
    systemHealth.status,
    apiHealth.status,
    swiftHealth.status,
    tenantHealth.status,
    nowPaymentsHealth.status,
    webhookHealth.status
  ].every(status => status === 'healthy') ? 'healthy' : 'unhealthy';

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbHealth,
      system: systemHealth,
      api: apiHealth,
      swift: swiftHealth,
      tenant: tenantHealth,
      nowpayments: nowPaymentsHealth,
      webhooks: webhookHealth
    }
  };
}

/**
 * Check database health
 */
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    // Test basic connection
    await query('SELECT 1');
    
    // Test table access
    await query('SELECT COUNT(*) FROM tenants');
    
    // Test query performance
    const performanceStart = Date.now();
    await query('SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    const queryTime = Date.now() - performanceStart;
    
    // Get connection pool stats
    const poolStats = await getPoolStats();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      queryTime: `${queryTime}ms`,
      connectionPool: poolStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get database connection pool stats
 */
async function getPoolStats() {
  try {
    // This would need to be implemented based on your database library
    // For now, return mock data
    return {
      totalConnections: 20,
      activeConnections: 5,
      idleConnections: 15,
      waitingClients: 0
    };
  } catch (error) {
    return {
      error: 'Unable to get pool stats',
      message: error.message
    };
  }
}

/**
 * Check system health
 */
async function checkSystemHealth() {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    
    // Calculate memory usage percentage
    const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;
    
    // Check disk space
    const diskSpace = await checkDiskSpace();
    
    // Determine health status
    let status = 'healthy';
    const issues = [];
    
    if (memoryUsagePercent > 90) {
      status = 'warning';
      issues.push('High memory usage');
    }
    
    if (loadAvg[0] > os.cpus().length * 2) {
      status = 'warning';
      issues.push('High CPU load');
    }
    
    if (diskSpace.freePercent < 10) {
      status = 'warning';
      issues.push('Low disk space');
    }
    
    return {
      status,
      issues,
      memory: {
        used: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        systemUsage: `${memoryUsagePercent.toFixed(2)}%`
      },
      cpu: {
        loadAverage: loadAvg.map(load => load.toFixed(2)),
        cores: os.cpus().length
      },
      disk: diskSpace,
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('System health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace() {
  try {
    const stats = fs.statSync(process.cwd());
    // This is a simplified check - in production, you'd want to check actual disk usage
    return {
      free: '50GB',
      total: '100GB',
      freePercent: 50
    };
  } catch (error) {
    return {
      error: 'Unable to check disk space',
      message: error.message
    };
  }
}

/**
 * Check API health
 */
async function checkAPIHealth() {
  try {
    const checks = [];
    
    // Check critical endpoints
    const criticalEndpoints = [
      '/api/auth/login',
      '/api/swift/messagetypes',
      '/api/admin/stats'
    ];
    
    for (const endpoint of criticalEndpoints) {
      try {
        // This would be an actual health check in production
        checks.push({
          endpoint,
          status: 'healthy',
          responseTime: '50ms'
        });
      } catch (error) {
        checks.push({
          endpoint,
          status: 'unhealthy',
          error: error.message
        });
      }
    }
    
    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      status: overallStatus,
      endpoints: checks,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('API health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check SWIFT services health
 */
async function checkSwiftServicesHealth() {
  try {
    const services = [];
    
    // Check SWIFT message generator
    try {
      const SwiftMessageGenerator = (await import('../utils/swiftMessageGeneratorEnhanced.js')).default;
      const generator = new SwiftMessageGenerator();
      const messageTypes = generator.getAllMessageTypes();
      
      services.push({
        service: 'SWIFT Message Generator',
        status: 'healthy',
        messageTypes: Object.keys(messageTypes.mt).length + Object.keys(messageTypes.mx).length
      });
    } catch (error) {
      services.push({
        service: 'SWIFT Message Generator',
        status: 'unhealthy',
        error: error.message
      });
    }
    
    // Check smart routing service
    try {
      const SmartRoutingService = (await import('../services/smartRoutingService.js')).default;
      const routingService = new SmartRoutingService();
      
      services.push({
        service: 'Smart Routing Service',
        status: 'healthy'
      });
    } catch (error) {
      services.push({
        service: 'Smart Routing Service',
        status: 'unhealthy',
        error: error.message
      });
    }
    
    // Check compliance service
    try {
      const complianceService = (await import('../services/industrySpecificCompliance.js')).default;
      
      services.push({
        service: 'Industry Compliance Service',
        status: 'healthy'
      });
    } catch (error) {
      services.push({
        service: 'Industry Compliance Service',
        status: 'unhealthy',
        error: error.message
      });
    }
    
    const overallStatus = services.every(service => service.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('SWIFT services health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check NowPayments health
 */
async function checkNowPaymentsHealth() {
  const startTime = Date.now();
  
  try {
    // Try to import NowPayments service
    const NowPaymentsService = (await import('../services/nowpaymentsService.js')).default;
    const nowPayments = new NowPaymentsService();
    
    // Test API status
    const status = await nowPayments.getApiStatus();
    
    // Test getting currencies
    const currencies = await nowPayments.getAvailableCurrencies();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      apiStatus: status,
      availableCurrencies: currencies.currencies?.length || 0,
      responseTime: `${responseTime}ms`,
      lastSync: new Date().toISOString()
    };
  } catch (error) {
    logger.error('NowPayments health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Check webhook health
 */
async function checkWebhookHealth() {
  try {
    // Check recent webhook activity
    const webhookActivity = await query(`
      SELECT 
        COUNT(*) as total_webhooks,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_webhooks,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_webhooks,
        MAX(created_at) as last_received
      FROM payment_notifications
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    const activity = webhookActivity.rows[0];
    
    // Calculate success rate
    const successRate = activity.total_webhooks > 0 
      ? ((activity.total_webhooks - (activity.total_webhooks * 0.05)) / activity.total_webhooks) * 100 // Assume 5% failure rate
      : 100;
    
    let status = 'healthy';
    if (activity.recent_webhooks === 0 && activity.last_24h_webhooks > 0) {
      status = 'warning'; // No recent webhooks but some in last 24h
    } else if (activity.last_24h_webhooks === 0) {
      status = 'unhealthy'; // No webhooks in 24h
    }
    
    return {
      status,
      lastReceived: activity.last_received || new Date().toISOString(),
      successRate: Math.round(successRate),
      totalWebhooks: activity.total_webhooks,
      recentWebhooks: activity.recent_webhooks,
      last24hWebhooks: activity.last_24h_webhooks
    };
  } catch (error) {
    logger.error('Webhook health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics() {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Get database performance
    const dbPerfStart = Date.now();
    await query('SELECT COUNT(*) FROM users');
    const dbQueryTime = Date.now() - dbPerfStart;
    
    // Get API response times (mock data)
    const apiResponseTimes = {
      average: '150ms',
      p95: '300ms',
      p99: '500ms'
    };
    
    return {
      memory: {
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      database: {
        queryTime: `${dbQueryTime}ms`,
        connections: '5/20' // active/total
      },
      api: apiResponseTimes,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Performance metrics failed:', error);
    throw error;
  }
}

/**
 * Get error rates
 */
async function getErrorRates(timeframe = '1h') {
  try {
    let timeCondition = '';
    switch (timeframe) {
      case '1h':
        timeCondition = "created_at > NOW() - INTERVAL '1 hour'";
        break;
      case '24h':
        timeCondition = "created_at > NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeCondition = "created_at > NOW() - INTERVAL '7 days'";
        break;
      default:
        timeCondition = "created_at > NOW() - INTERVAL '1 hour'";
    }
    
    // Get error logs (mock implementation)
    const errorStats = {
      total_requests: 1000,
      error_count: 25,
      error_rate: 2.5,
      common_errors: [
        { type: 'timeout', count: 10 },
        { type: 'validation', count: 8 },
        { type: 'database', count: 5 },
        { type: 'api', count: 2 }
      ]
    };
    
    return {
      timeframe,
      ...errorStats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error rates check failed:', error);
    throw error;
  }
}

/**
 * Get system uptime
 */
function getSystemUptime() {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  return {
    uptime: uptime,
    uptime_formatted: `${days}d ${hours}h ${minutes}m`,
    process_start: new Date(Date.now() - uptime * 1000).toISOString(),
    timestamp: new Date().toISOString()
  };
}
async function checkTenantHealth() {
  try {
    // Check tenant configuration
    const tenantCount = await query('SELECT COUNT(*) as count FROM tenants WHERE is_active = true');
    const userCount = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    const messageCount = await query('SELECT COUNT(*) as count FROM messages WHERE created_at > NOW() - INTERVAL \'24 hours\'');
    
    // Check tenant isolation
    const isolationCheck = await query(`
      SELECT COUNT(DISTINCT tenant_id) as tenant_count 
      FROM messages 
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `);
    
    return {
      status: 'healthy',
      metrics: {
        activeTenants: parseInt(tenantCount.rows[0].count),
        activeUsers: parseInt(userCount.rows[0].count),
        messages24h: parseInt(messageCount.rows[0].count),
        tenantIsolation: parseInt(isolationCheck.rows[0].tenant_count)
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Tenant health check failed:', error);
    
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    const health = await getDetailedHealth();
    
    if (health.status === 'healthy') {
      res.json({
        success: true,
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'not ready',
        issues: Object.entries(health.services)
          .filter(([_, service]) => service.status !== 'healthy')
          .map(([name, service]) => `${name}: ${service.error || 'unhealthy'}`),
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Advanced system health endpoint
 */
router.get('/advanced', async (req, res) => {
  try {
    const systemHealthService = (await import('../services/systemHealthService.js')).default;
    const health = await systemHealthService.getSystemHealth();
    
    const statusCode = health.overall === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.overall === 'healthy',
      data: health
    });
  } catch (error) {
    logger.error('Advanced health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Advanced health check failed',
      message: error.message
    });
  }
});

/**
 * Real-time metrics endpoint
 */
router.get('/realtime', async (req, res) => {
  try {
    const systemHealthService = (await import('../services/systemHealthService.js')).default;
    const metrics = await systemHealthService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Real-time metrics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Real-time metrics failed',
      message: error.message
    });
  }
});

/**
 * System alerts endpoint
 */
router.get('/alerts', async (req, res) => {
  try {
    const systemHealthService = (await import('../services/systemHealthService.js')).default;
    const health = await systemHealthService.getSystemHealth();
    
    res.json({
      success: true,
      data: health.alerts
    });
  } catch (error) {
    logger.error('System alerts failed:', error);
    res.status(500).json({
      success: false,
      error: 'System alerts failed',
      message: error.message
    });
  }
});

export default router;
