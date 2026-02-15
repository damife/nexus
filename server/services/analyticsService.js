import { query } from '../config/database.js';
import logger from '../config/logger.js';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache
  }

  /**
   * Get comprehensive analytics data
   */
  async getAnalytics(timeRange = '7d') {
    try {
      const cacheKey = `analytics_${timeRange}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const analytics = {
        overview: await this.getOverview(timeRange),
        messageStats: await this.getMessageStats(timeRange),
        userActivity: await this.getUserActivity(timeRange),
        financialStats: await this.getFinancialStats(timeRange),
        systemHealth: await this.getSystemHealth(),
        realTimeData: await this.getRealTimeData()
      };

      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      return analytics;
    } catch (error) {
      logger.error('Error fetching analytics', {
        timeRange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get overview statistics
   */
  async getOverview(timeRange) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          COUNT(*) as totalMessages,
          COUNT(*) FILTER (WHERE status = 'completed') as successfulMessages,
          COUNT(*) FILTER (WHERE status = 'failed') as failedMessages,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as todayMessages,
          COUNT(DISTINCT created_by) as activeUsers,
          SUM(CASE WHEN f.amount IS NOT NULL THEN f.amount ELSE 0 END) as totalRevenue
        FROM messages m
        LEFT JOIN fees f ON m.message_type = f.message_type
        WHERE m.created_at >= ${timeCondition}
      `);

      const previousPeriodResult = await query(`
        SELECT 
          COUNT(*) as totalMessages,
          COUNT(DISTINCT created_by) as activeUsers,
          SUM(CASE WHEN f.amount IS NOT NULL THEN f.amount ELSE 0 END) as totalRevenue
        FROM messages m
        LEFT JOIN fees f ON m.message_type = f.message_type
        WHERE m.created_at >= ${this.getPreviousPeriodCondition(timeRange)}
        AND m.created_at < ${timeCondition}
      `);

      const current = result.rows[0];
      const previous = previousPeriodResult.rows[0];

      return {
        totalMessages: parseInt(current.totalmessages) || 0,
        successfulMessages: parseInt(current.successfulmessages) || 0,
        failedMessages: parseInt(current.failedmessages) || 0,
        todayMessages: parseInt(current.todaymessages) || 0,
        activeUsers: parseInt(current.activeusers) || 0,
        totalRevenue: parseFloat(current.totalrevenue) || 0,
        successRate: current.totalmessages > 0 ? current.successfulmessages / current.totalmessages : 0,
        messageTrend: this.calculateTrend(previous.totalmessages, current.totalmessages),
        userTrend: this.calculateTrend(previous.activeusers, current.activeusers),
        revenueTrend: this.calculateTrend(previous.totalrevenue, current.totalrevenue)
      };
    } catch (error) {
      logger.error('Error getting overview', { error: error.message });
      throw error;
    }
  }

  /**
   * Get message statistics by type
   */
  async getMessageStats(timeRange) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          message_type,
          COUNT(*) as count
        FROM messages
        WHERE created_at >= ${timeCondition}
        GROUP BY message_type
      `);

      const stats = {};
      result.rows.forEach(row => {
        stats[row.message_type.toLowerCase()] = parseInt(row.count);
      });

      return stats;
    } catch (error) {
      logger.error('Error getting message stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity data
   */
  async getUserActivity(timeRange) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as message_count,
          COUNT(DISTINCT created_by) as active_users
        FROM messages
        WHERE created_at >= ${timeCondition}
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
        LIMIT 24
      `);

      return result.rows.map(row => ({
        hour: row.hour,
        messageCount: parseInt(row.message_count),
        activeUsers: parseInt(row.active_users)
      }));
    } catch (error) {
      logger.error('Error getting user activity', { error: error.message });
      throw error;
    }
  }

  /**
   * Get financial statistics
   */
  async getFinancialStats(timeRange) {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          COALESCE(SUM(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END), 0) as total_volume,
          COALESCE(AVG(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END), 0) as avg_transaction_size,
          COUNT(*) as total_transactions
        FROM messages
        WHERE created_at >= ${timeCondition}
        AND amount IS NOT NULL
      `);

      const cryptoResult = await query(`
        SELECT 
          COALESCE(SUM(amount), 0) as crypto_deposits,
          COUNT(*) as crypto_transactions
        FROM crypto_transactions
        WHERE created_at >= ${timeCondition}
        AND status = 'completed'
      `);

      const feesResult = await query(`
        SELECT 
          COALESCE(SUM(f.amount), 0) as fees_collected
        FROM messages m
        LEFT JOIN fees f ON m.message_type = f.message_type
        WHERE m.created_at >= ${timeCondition}
      `);

      const pendingResult = await query(`
        SELECT COUNT(*) as pending_count
        FROM messages
        WHERE status IN ('pending', 'processing')
      `);

      return {
        totalVolume: parseFloat(result.rows[0].total_volume) || 0,
        avgTransactionSize: parseFloat(result.rows[0].avg_transaction_size) || 0,
        totalTransactions: parseInt(result.rows[0].total_transactions) || 0,
        cryptoDeposits: parseFloat(cryptoResult.rows[0].crypto_deposits) || 0,
        cryptoTransactions: parseInt(cryptoResult.rows[0].crypto_transactions) || 0,
        feesCollected: parseFloat(feesResult.rows[0].fees_collected) || 0,
        pendingTransactions: parseInt(pendingResult.rows[0].pending_count) || 0
      };
    } catch (error) {
      logger.error('Error getting financial stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    try {
      // Database health
      const dbResult = await query('SELECT NOW() as current_time');
      const dbStatus = dbResult.rows[0] ? 'healthy' : 'error';

      // API response time (mock - would need actual monitoring)
      const apiResponseTime = Math.floor(Math.random() * 100) + 50; // 50-150ms
      const apiStatus = apiResponseTime < 200 ? 'healthy' : 'warning';

      // Email service status (mock - would need actual health check)
      const emailStatus = Math.random() > 0.1 ? 'healthy' : 'warning';

      // Crypto service status (mock - would need actual health check)
      const cryptoStatus = Math.random() > 0.05 ? 'healthy' : 'warning';

      // Memory usage (mock - would need actual system monitoring)
      const memoryUsage = Math.floor(Math.random() * 30) + 40; // 40-70%

      // CPU usage (mock - would need actual system monitoring)
      const cpuUsage = Math.floor(Math.random() * 20) + 20; // 20-40%

      return {
        apiStatus,
        apiResponseTime,
        dbStatus,
        emailStatus,
        cryptoStatus,
        memoryUsage,
        cpuUsage,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting system health', { error: error.message });
      throw error;
    }
  }

  /**
   * Get real-time activity data
   */
  async getRealTimeData() {
    try {
      const result = await query(`
        SELECT 
          'message' as type,
          message_type as title,
          'New ' || message_type || ' message' as description,
          created_at as timestamp
        FROM messages
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'user' as type,
          'User Activity',
          'User ' || u.name || ' logged in' as description,
          last_login as timestamp
        FROM users u
        WHERE last_login >= NOW() - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'system' as type,
          'System Event',
          'System health check completed' as description,
          NOW() as timestamp
        
        ORDER BY timestamp DESC
        LIMIT 20
      `);

      return result.rows.map(row => ({
        type: row.type,
        title: row.title,
        description: row.description,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Error getting real-time data', { error: error.message });
      throw error;
    }
  }

  /**
   * Get time condition for SQL queries
   */
  getTimeCondition(timeRange) {
    const intervals = {
      '24h': "NOW() - INTERVAL '24 hours'",
      '7d': "NOW() - INTERVAL '7 days'",
      '30d': "NOW() - INTERVAL '30 days'",
      '90d': "NOW() - INTERVAL '90 days'"
    };
    return intervals[timeRange] || intervals['7d'];
  }

  /**
   * Get previous period condition for trend calculation
   */
  getPreviousPeriodCondition(timeRange) {
    const intervals = {
      '24h': "NOW() - INTERVAL '48 hours'",
      '7d': "NOW() - INTERVAL '14 days'",
      '30d': "NOW() - INTERVAL '60 days'",
      '90d': "NOW() - INTERVAL '180 days'"
    };
    return intervals[timeRange] || intervals['7d'];
  }

  /**
   * Calculate trend percentage
   */
  calculateTrend(previous, current) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get message volume trends over time
   */
  async getMessageVolumeTrends(timeRange = '7d') {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as message_count,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_count,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_count
        FROM messages
        WHERE created_at >= ${timeCondition}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `);

      return result.rows.map(row => ({
        date: row.date,
        messageCount: parseInt(row.message_count),
        successfulCount: parseInt(row.successful_count),
        failedCount: parseInt(row.failed_count)
      }));
    } catch (error) {
      logger.error('Error getting message volume trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity heatmap data
   */
  async getUserActivityHeatmap(timeRange = '7d') {
    try {
      const timeCondition = this.getTimeCondition(timeRange);
      
      const result = await query(`
        SELECT 
          EXTRACT(DOW FROM created_at) as day_of_week,
          EXTRACT(HOUR FROM created_at) as hour_of_day,
          COUNT(*) as activity_count
        FROM messages
        WHERE created_at >= ${timeCondition}
        GROUP BY EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
        ORDER BY day_of_week, hour_of_day
      `);

      const heatmap = {};
      result.rows.forEach(row => {
        const day = parseInt(row.day_of_week);
        const hour = parseInt(row.hour_of_day);
        if (!heatmap[day]) heatmap[day] = {};
        heatmap[day][hour] = parseInt(row.activity_count);
      });

      return heatmap;
    } catch (error) {
      logger.error('Error getting user activity heatmap', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear analytics cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new AnalyticsService();
