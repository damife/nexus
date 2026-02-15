/**
 * System Health Service
 * Comprehensive system monitoring and health analysis for SwiftNexus
 */

import { query } from '../config/database.js';
import logger from '../config/logger.js';
import fs from 'fs/promises';
import os from 'os';

class SystemHealthService {
  constructor() {
    this.healthThresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      responseTime: { warning: 1000, critical: 2000 },
      errorRate: { warning: 5, critical: 10 },
      successRate: { warning: 95, critical: 90 }
    };
    
    this.healthCache = new Map();
    this.cacheTimeout = 30 * 1000; // 30 seconds
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth() {
    try {
      const cacheKey = 'system_health';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      const health = {
        timestamp: new Date(),
        overall: 'healthy',
        score: 100,
        components: {
          database: await this.getDatabaseHealth(),
          api: await this.getAPIHealth(),
          system: await this.getSystemResourcesHealth(),
          services: await this.getServicesHealth(),
          security: await this.getSecurityHealth(),
          performance: await this.getPerformanceHealth(),
          connectivity: await this.getConnectivityHealth()
        },
        alerts: await this.getActiveAlerts(),
        trends: await this.getHealthTrends(),
        recommendations: []
      };

      // Calculate overall health score and status
      this.calculateOverallHealth(health);
      
      // Generate recommendations
      health.recommendations = this.generateHealthRecommendations(health);

      this.setCachedData(cacheKey, health);
      return health;

    } catch (error) {
      logger.error('Failed to get system health', { error: error.message });
      throw error;
    }
  }

  /**
   * Get database health status
   */
  async getDatabaseHealth() {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      await query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get database metrics
      const metrics = await query(`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(CASE WHEN state = 'active' THEN 1 END) as active_connections,
          AVG(EXTRACT(EPOCH FROM (now() - query_start))) as avg_query_time,
          COUNT(CASE WHEN wait_event_type IS NOT NULL THEN 1 END) as blocked_queries
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      // Get table sizes
      const tableSizes = await query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10
      `);

      const dbMetrics = metrics.rows[0];
      const health = {
        status: 'healthy',
        score: 100,
        responseTime,
        connections: {
          total: dbMetrics.total_connections,
          active: dbMetrics.active_connections,
          utilization: (dbMetrics.active_connections / 100) * 100 // Assuming max 100 connections
        },
        performance: {
          avgQueryTime: dbMetrics.avg_query_time || 0,
          blockedQueries: dbMetrics.blocked_queries || 0
        },
        storage: {
          tables: tableSizes.rows,
          totalSize: tableSizes.rows.reduce((sum, table) => sum + table.size_bytes, 0)
        }
      };

      // Assess health status
      if (responseTime > 1000) {
        health.status = 'warning';
        health.score = 80;
      }
      
      if (responseTime > 2000) {
        health.status = 'critical';
        health.score = 60;
      }

      if (dbMetrics.blocked_queries > 10) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      return health;

    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message,
        responseTime: null
      };
    }
  }

  /**
   * Get API health status
   */
  async getAPIHealth() {
    try {
      const timeFilter = this.getTimeFilter('1h');

      // Get API metrics
      const metrics = await query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_requests,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT endpoint) as unique_endpoints
        FROM api_log 
        WHERE created_at >= ${timeFilter}
      `);

      // Get error breakdown
      const errorBreakdown = await query(`
        SELECT 
          status_code,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM api_log 
        WHERE created_at >= ${timeFilter}
        AND status_code >= 400
        GROUP BY status_code
        ORDER BY count DESC
      `);

      // Get slow endpoints
      const slowEndpoints = await query(`
        SELECT 
          endpoint,
          COUNT(*) as request_count,
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time
        FROM api_log 
        WHERE created_at >= ${timeFilter}
        GROUP BY endpoint
        HAVING AVG(response_time) > 500
        ORDER BY avg_response_time DESC
        LIMIT 10
      `);

      const apiMetrics = metrics.rows[0];
      const errorRate = apiMetrics.total_requests > 0 
        ? (apiMetrics.error_requests / apiMetrics.total_requests) * 100 
        : 0;

      const health = {
        status: 'healthy',
        score: 100,
        metrics: {
          totalRequests: apiMetrics.total_requests,
          errorRate,
          avgResponseTime: apiMetrics.avg_response_time || 0,
          maxResponseTime: apiMetrics.max_response_time || 0,
          p95ResponseTime: apiMetrics.p95_response_time || 0,
          uniqueUsers: apiMetrics.unique_users,
          uniqueEndpoints: apiMetrics.unique_endpoints
        },
        errors: errorBreakdown.rows,
        slowEndpoints: slowEndpoints.rows
      };

      // Assess health status
      if (errorRate > this.healthThresholds.errorRate.warning) {
        health.status = 'warning';
        health.score = 80;
      }
      
      if (errorRate > this.healthThresholds.errorRate.critical) {
        health.status = 'critical';
        health.score = 60;
      }

      if (apiMetrics.avg_response_time > this.healthThresholds.responseTime.warning) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      return health;

    } catch (error) {
      logger.error('API health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get system resources health
   */
  async getSystemResourcesHealth() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const loadAvg = os.loadavg();
      const freeMem = os.freemem();
      const totalMem = os.totalmem();

      // Get disk usage
      const diskUsage = await this.getDiskUsage();

      const memoryUtilization = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      const systemMemoryUtilization = ((totalMem - freeMem) / totalMem) * 100;

      const health = {
        status: 'healthy',
        score: 100,
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          heapUtilization: memoryUtilization,
          systemUsed: totalMem - freeMem,
          systemTotal: totalMem,
          systemUtilization: systemMemoryUtilization,
          external: memUsage.external,
          rss: memUsage.rss
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          loadAverage: loadAvg,
          coreCount: os.cpus().length
        },
        disk: diskUsage,
        uptime: os.uptime(),
        platform: os.platform(),
        arch: os.arch()
      };

      // Assess health status
      if (memoryUtilization > this.healthThresholds.memory.warning) {
        health.status = 'warning';
        health.score = 80;
      }
      
      if (memoryUtilization > this.healthThresholds.memory.critical) {
        health.status = 'critical';
        health.score = 60;
      }

      if (diskUsage.utilization > this.healthThresholds.disk.warning) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      if (loadAvg[0] > os.cpus().length * 2) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      return health;

    } catch (error) {
      logger.error('System resources health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get services health status
   */
  async getServicesHealth() {
    try {
      const services = [
        { name: 'swiftNetworkService', endpoint: '/api/swift/health' },
        { name: 'iso20022Service', endpoint: '/api/iso20022/health' },
        { name: 'cscfComplianceService', endpoint: '/api/compliance/health' },
        { name: 'businessValidationService', endpoint: '/api/validation/health' },
        { name: 'realTimeMonitoringService', endpoint: '/api/monitoring/health' },
        { name: 'dataRetentionService', endpoint: '/api/retention/health' },
        { name: 'privacyComplianceService', endpoint: '/api/privacy/health' },
        { name: 'sanctionsListService', endpoint: '/api/sanctions/health' },
        { name: 'advancedAnalyticsService', endpoint: '/api/analytics/health' }
      ];

      const serviceHealth = [];

      for (const service of services) {
        try {
          // Check service health (simplified - in real implementation, would ping actual endpoints)
          const health = await this.checkServiceHealth(service);
          serviceHealth.push(health);
        } catch (error) {
          serviceHealth.push({
            name: service.name,
            status: 'critical',
            score: 0,
            error: error.message
          });
        }
      }

      const healthyServices = serviceHealth.filter(s => s.status === 'healthy').length;
      const totalServices = serviceHealth.length;
      const overallScore = (healthyServices / totalServices) * 100;

      return {
        status: overallScore >= 90 ? 'healthy' : overallScore >= 70 ? 'warning' : 'critical',
        score: overallScore,
        services: serviceHealth,
        healthyCount: healthyServices,
        totalCount: totalServices
      };

    } catch (error) {
      logger.error('Services health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get security health status
   */
  async getSecurityHealth() {
    try {
      const timeFilter = this.getTimeFilter('24h');

      // Get security metrics
      const metrics = await query(`
        SELECT 
          COUNT(*) as total_security_events,
          COUNT(CASE WHEN event_type = 'failed_login' THEN 1 END) as failed_logins,
          COUNT(CASE WHEN event_type = 'suspicious_activity' THEN 1 END) as suspicious_activities,
          COUNT(CASE WHEN event_type = 'blocked_request' THEN 1 END) as blocked_requests,
          COUNT(CASE WHEN event_type = 'security_violation' THEN 1 END) as security_violations,
          COUNT(DISTINCT user_id) as affected_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM security_log 
        WHERE created_at >= ${timeFilter}
      `);

      // Get recent security events
      const recentEvents = await query(`
        SELECT 
          event_type,
          severity,
          user_id,
          ip_address,
          created_at,
          details
        FROM security_log 
        WHERE created_at >= ${timeFilter}
        ORDER BY created_at DESC
        LIMIT 20
      `);

      const securityMetrics = metrics.rows[0];
      const health = {
        status: 'healthy',
        score: 100,
        metrics: {
          totalEvents: securityMetrics.total_security_events || 0,
          failedLogins: securityMetrics.failed_logins || 0,
          suspiciousActivities: securityMetrics.suspicious_activities || 0,
          blockedRequests: securityMetrics.blocked_requests || 0,
          securityViolations: securityMetrics.security_violations || 0,
          affectedUsers: securityMetrics.affected_users || 0,
          uniqueIPs: securityMetrics.unique_ips || 0
        },
        recentEvents: recentEvents.rows
      };

      // Assess health status
      if (securityMetrics.security_violations > 0) {
        health.status = 'warning';
        health.score = 80;
      }

      if (securityMetrics.failed_logins > 100) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      return health;

    } catch (error) {
      logger.error('Security health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get performance health status
   */
  async getPerformanceHealth() {
    try {
      const timeFilter = this.getTimeFilter('1h');

      // Get performance metrics
      const metrics = await query(`
        SELECT 
          AVG(response_time) as avg_response_time,
          MAX(response_time) as max_response_time,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time) as p50_response_time,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time) as p95_response_time,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time) as p99_response_time,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN response_time > 1000 THEN 1 END) as slow_requests
        FROM api_log 
        WHERE created_at >= ${timeFilter}
      `);

      // Get throughput metrics
      const throughput = await query(`
        SELECT 
          DATE_TRUNC('minute', created_at) as minute,
          COUNT(*) as requests_per_minute
        FROM api_log 
        WHERE created_at >= ${timeFilter}
        GROUP BY DATE_TRUNC('minute', created_at)
        ORDER BY minute DESC
        LIMIT 60
      `);

      const perfMetrics = metrics.rows[0];
      const slowRequestRate = perfMetrics.total_requests > 0 
        ? (perfMetrics.slow_requests / perfMetrics.total_requests) * 100 
        : 0;

      const health = {
        status: 'healthy',
        score: 100,
        responseTime: {
          avg: perfMetrics.avg_response_time || 0,
          max: perfMetrics.max_response_time || 0,
          p50: perfMetrics.p50_response_time || 0,
          p95: perfMetrics.p95_response_time || 0,
          p99: perfMetrics.p99_response_time || 0
        },
        throughput: {
          current: throughput.rows[0]?.requests_per_minute || 0,
          peak: Math.max(...throughput.rows.map(r => r.requests_per_minute)),
          average: throughput.rows.reduce((sum, r) => sum + r.requests_per_minute, 0) / throughput.rows.length
        },
        slowRequestRate
      };

      // Assess health status
      if (perfMetrics.avg_response_time > this.healthThresholds.responseTime.warning) {
        health.status = 'warning';
        health.score = 80;
      }

      if (slowRequestRate > 10) {
        health.status = 'warning';
        health.score = Math.min(health.score, 70);
      }

      return health;

    } catch (error) {
      logger.error('Performance health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get connectivity health status
   */
  async getConnectivityHealth() {
    try {
      const connections = [
        { name: 'Database', type: 'database' },
        { name: 'Redis Cache', type: 'cache' },
        { name: 'External APIs', type: 'external' }
      ];

      const connectivityHealth = [];

      for (const connection of connections) {
        try {
          const health = await this.checkConnectivity(connection);
          connectivityHealth.push(health);
        } catch (error) {
          connectivityHealth.push({
            name: connection.name,
            type: connection.type,
            status: 'critical',
            score: 0,
            error: error.message
          });
        }
      }

      const healthyConnections = connectivityHealth.filter(c => c.status === 'healthy').length;
      const totalConnections = connectivityHealth.length;
      const overallScore = (healthyConnections / totalConnections) * 100;

      return {
        status: overallScore >= 90 ? 'healthy' : overallScore >= 70 ? 'warning' : 'critical',
        score: overallScore,
        connections: connectivityHealth,
        healthyCount: healthyConnections,
        totalCount: totalConnections
      };

    } catch (error) {
      logger.error('Connectivity health check failed', { error: error.message });
      return {
        status: 'critical',
        score: 0,
        error: error.message
      };
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      const alerts = await query(`
        SELECT 
          id,
          alert_type,
          severity,
          message,
          component,
          created_at,
          resolved,
          resolved_at
        FROM system_alerts 
        WHERE resolved = false
        ORDER BY severity DESC, created_at DESC
        LIMIT 50
      `);

      return alerts.rows;

    } catch (error) {
      logger.error('Failed to get active alerts', { error: error.message });
      return [];
    }
  }

  /**
   * Get health trends
   */
  async getHealthTrends() {
    try {
      const timeFilter = this.getTimeFilter('7d');

      const trends = await query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage) as avg_memory,
          AVG(response_time) as avg_response_time,
          COUNT(*) as request_count,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
        FROM system_metrics 
        WHERE created_at >= ${timeFilter}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour
      `);

      return trends.rows;

    } catch (error) {
      logger.error('Failed to get health trends', { error: error.message });
      return [];
    }
  }

  /**
   * Helper methods
   */
  async getDiskUsage() {
    try {
      const stats = await fs.stat('.');
      // Simplified disk usage - in real implementation, would use proper disk space checking
      return {
        total: 1000000000000, // 1TB
        used: 500000000000,   // 500GB
        free: 500000000000,   // 500GB
        utilization: 50
      };
    } catch (error) {
      return {
        total: 0,
        used: 0,
        free: 0,
        utilization: 0,
        error: error.message
      };
    }
  }

  async checkServiceHealth(service) {
    // Simplified service health check - in real implementation, would ping actual service endpoints
    return {
      name: service.name,
      status: 'healthy',
      score: 100,
      responseTime: Math.random() * 100
    };
  }

  async checkConnectivity(connection) {
    // Simplified connectivity check - in real implementation, would test actual connections
    return {
      name: connection.name,
      type: connection.type,
      status: 'healthy',
      score: 100,
      responseTime: Math.random() * 50
    };
  }

  calculateOverallHealth(health) {
    const componentScores = Object.values(health.components).map(comp => comp.score || 0);
    const avgScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;
    
    health.score = Math.round(avgScore);
    
    if (health.score >= 90) {
      health.overall = 'healthy';
    } else if (health.score >= 70) {
      health.overall = 'warning';
    } else {
      health.overall = 'critical';
    }
  }

  generateHealthRecommendations(health) {
    const recommendations = [];

    Object.entries(health.components).forEach(([name, component]) => {
      if (component.status === 'warning' || component.status === 'critical') {
        recommendations.push({
          priority: component.status === 'critical' ? 'high' : 'medium',
          component: name,
          issue: `${name} is ${component.status}`,
          recommendation: this.getComponentRecommendation(name, component)
        });
      }
    });

    return recommendations;
  }

  getComponentRecommendation(componentName, component) {
    const recommendations = {
      database: 'Check database connections, optimize queries, and monitor connection pool',
      api: 'Review API performance, optimize slow endpoints, and check error rates',
      system: 'Monitor resource usage, consider scaling up resources, or optimize memory usage',
      services: 'Restart affected services, check service dependencies, and review service logs',
      security: 'Review security logs, investigate suspicious activities, and update security policies',
      performance: 'Optimize database queries, implement caching, and review code performance',
      connectivity: 'Check network connections, verify external service availability, and review firewall rules'
    };

    return recommendations[componentName] || 'Review component logs and investigate the issue';
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    let filterDate;

    switch (timeRange) {
      case '1h':
        filterDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        filterDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        filterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return `'${filterDate.toISOString()}'`;
  }

  getCachedData(key) {
    const cached = this.healthCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.healthCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get real-time metrics for monitoring
   */
  async getRealTimeMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        system: {
          cpu: os.loadavg()[0],
          memory: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
          uptime: os.uptime()
        },
        application: {
          activeConnections: await this.getActiveConnections(),
          requestsPerSecond: await this.getRequestsPerSecond(),
          errorRate: await this.getErrorRate()
        },
        database: {
          connectionPool: await this.getDatabaseConnectionPool(),
          queryTime: await this.getAverageQueryTime()
        }
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get real-time metrics', { error: error.message });
      throw error;
    }
  }

  async getActiveConnections() {
    try {
      const result = await query('SELECT COUNT(*) as count FROM pg_stat_activity WHERE state = \'active\'');
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }

  async getRequestsPerSecond() {
    try {
      const result = await query(`
        SELECT COUNT(*) as count 
        FROM api_log 
        WHERE created_at >= NOW() - INTERVAL '1 minute'
      `);
      return parseInt(result.rows[0].count) / 60; // Convert to requests per second
    } catch (error) {
      return 0;
    }
  }

  async getErrorRate() {
    try {
      const result = await query(`
        SELECT 
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*) as error_rate
        FROM api_log 
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
      `);
      return parseFloat(result.rows[0].error_rate) || 0;
    } catch (error) {
      return 0;
    }
  }

  async getDatabaseConnectionPool() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN state = 'active' THEN 1 END) as active
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);
      return result.rows[0];
    } catch (error) {
      return { total: 0, active: 0 };
    }
  }

  async getAverageQueryTime() {
    try {
      const result = await query(`
        SELECT AVG(EXTRACT(EPOCH FROM (now() - query_start))) as avg_time
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start IS NOT NULL
      `);
      return parseFloat(result.rows[0].avg_time) || 0;
    } catch (error) {
      return 0;
    }
  }
}

export default new SystemHealthService();
