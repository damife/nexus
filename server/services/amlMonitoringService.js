import { query } from '../config/database.js';
import logger from '../config/logger.js';

class AMLMonitoringService {
  constructor() {
    this.suspiciousPatterns = {
      highValueTransactions: {
        threshold: 10000, // USD
        window: '24h',
        description: 'High-value transactions'
      },
      frequentTransactions: {
        threshold: 10,
        window: '1h',
        description: 'Frequent transactions in short time'
      },
      roundAmounts: {
        enabled: true,
        description: 'Round number transactions (potential structuring)'
      },
      unusualHours: {
        startHour: 22,
        endHour: 6,
        description: 'Transactions outside business hours'
      },
      rapidSuccession: {
        threshold: 5,
        window: '10m',
        description: 'Multiple transactions in rapid succession'
      }
    };

    this.riskLevels = {
      low: { score: 1-20, color: 'green', action: 'monitor' },
      medium: { score: 21-50, color: 'yellow', action: 'review' },
      high: { score: 51-80, color: 'orange', action: 'investigate' },
      critical: { score: 81-100, color: 'red', action: 'block' }
    };
  }

  // Monitor transaction for suspicious activity
  async monitorTransaction(transactionData) {
    try {
      const { userId, amount, messageType, recipientBIC, timestamp } = transactionData;
      
      const monitoringResult = {
        transaction: transactionData,
        timestamp: new Date().toISOString(),
        riskScore: 0,
        alerts: [],
        recommendations: []
      };

      // Check various suspicious patterns
      const alerts = [];

      // Check high-value transaction
      if (amount >= this.suspiciousPatterns.highValueTransactions.threshold) {
        alerts.push({
          type: 'high_value',
          severity: 'high',
          score: 40,
          description: `High-value transaction: $${amount.toLocaleString()}`,
          details: {
            amount,
            threshold: this.suspiciousPatterns.highValueTransactions.threshold
          }
        });
      }

      // Check frequent transactions
      const frequentTxCount = await this.getTransactionCount(userId, '1h');
      if (frequentTxCount >= this.suspiciousPatterns.frequentTransactions.threshold) {
        alerts.push({
          type: 'frequent_transactions',
          severity: 'medium',
          score: 30,
          description: `Frequent transactions: ${frequentTxCount} in 1 hour`,
          details: {
            count: frequentTxCount,
            threshold: this.suspiciousPatterns.frequentTransactions.threshold
          }
        });
      }

      // Check round amounts (potential structuring)
      if (this.suspiciousPatterns.roundAmounts.enabled && this.isRoundAmount(amount)) {
        alerts.push({
          type: 'round_amount',
          severity: 'low',
          score: 15,
          description: `Round amount transaction: $${amount.toLocaleString()}`,
          details: { amount }
        });
      }

      // Check unusual hours
      const hour = new Date(timestamp).getHours();
      if (hour >= this.suspiciousPatterns.unusualHours.startHour || 
          hour <= this.suspiciousPatterns.unusualHours.endHour) {
        alerts.push({
          type: 'unusual_hours',
          severity: 'low',
          score: 10,
          description: `Transaction outside business hours: ${hour}:00`,
          details: { hour }
        });
      }

      // Check rapid succession
      const rapidTxCount = await this.getTransactionCount(userId, '10m');
      if (rapidTxCount >= this.suspiciousPatterns.rapidSuccession.threshold) {
        alerts.push({
          type: 'rapid_succession',
          severity: 'high',
          score: 35,
          description: `Rapid succession: ${rapidTxCount} transactions in 10 minutes`,
          details: {
            count: rapidTxCount,
            threshold: this.suspiciousPatterns.rapidSuccession.threshold
          }
        });
      }

      // Calculate total risk score
      const totalRiskScore = alerts.reduce((sum, alert) => sum + alert.score, 0);
      monitoringResult.riskScore = Math.min(totalRiskScore, 100);
      monitoringResult.alerts = alerts;

      // Generate recommendations
      monitoringResult.recommendations = this.generateAMLRecommendations(monitoringResult);

      // Store monitoring result
      await this.storeMonitoringResult(monitoringResult);

      // Create SAR if critical risk
      if (monitoringResult.riskScore >= 80) {
        await this.createSAR(monitoringResult);
      }

      logger.info('AML monitoring completed', {
        userId,
        amount,
        riskScore: monitoringResult.riskScore,
        alertsCount: alerts.length
      });

      return monitoringResult;

    } catch (error) {
      logger.error('Error in AML monitoring', {
        error: error.message,
        transactionData
      });
      throw error;
    }
  }

  // Get transaction count for user in time window
  async getTransactionCount(userId, timeWindow) {
    try {
      let interval = '';
      switch (timeWindow) {
        case '1h':
          interval = '1 hour';
          break;
        case '10m':
          interval = '10 minutes';
          break;
        case '24h':
          interval = '24 hours';
          break;
        default:
          interval = timeWindow;
      }

      const result = await query(`
        SELECT COUNT(*) as count
        FROM messages 
        WHERE created_by = $1 
        AND created_at >= NOW() - INTERVAL '${interval}'
      `, [userId]);

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting transaction count', {
        error: error.message,
        userId,
        timeWindow
      });
      return 0;
    }
  }

  // Check if amount is a round number
  isRoundAmount(amount) {
    // Check if amount is a round number (no cents or ends with .00, .50, .25)
    const rounded = Math.round(amount);
    return amount === rounded || 
           amount === rounded + 0.50 || 
           amount === rounded + 0.25 ||
           amount === rounded + 0.75;
  }

  // Generate AML recommendations
  generateAMLRecommendations(monitoringResult) {
    const recommendations = [];
    const { riskScore, alerts } = monitoringResult;

    if (riskScore >= 80) {
      recommendations.push({
        level: 'critical',
        action: 'block',
        message: 'Critical risk - transaction should be blocked and SAR filed',
        requiresAction: true,
        autoBlock: true
      });
    } else if (riskScore >= 50) {
      recommendations.push({
        level: 'high',
        action: 'investigate',
        message: 'High risk - manual investigation required',
        requiresAction: true,
        autoBlock: false
      });
    } else if (riskScore >= 20) {
      recommendations.push({
        level: 'medium',
        action: 'review',
        message: 'Medium risk - enhanced monitoring recommended',
        requiresAction: false,
        autoBlock: false
      });
    } else {
      recommendations.push({
        level: 'low',
        action: 'monitor',
        message: 'Low risk - normal processing',
        requiresAction: false,
        autoBlock: false
      });
    }

    // Add specific recommendations based on alert types
    alerts.forEach(alert => {
      switch (alert.type) {
        case 'high_value':
          recommendations.push({
            type: 'specific',
            message: 'Consider additional documentation for high-value transactions'
          });
          break;
        case 'frequent_transactions':
          recommendations.push({
            type: 'specific',
            message: 'Monitor for potential structuring or money laundering patterns'
          });
          break;
        case 'rapid_succession':
          recommendations.push({
            type: 'specific',
            message: 'Implement rate limiting for this user'
          });
          break;
      }
    });

    return recommendations;
  }

  // Store monitoring result
  async storeMonitoringResult(monitoringResult) {
    try {
      await query(`
        INSERT INTO aml_monitoring (
          user_id, transaction_id, risk_score, alerts, 
          monitoring_data, created_at
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        monitoringResult.transaction.userId,
        monitoringResult.transaction.id || 'unknown',
        monitoringResult.riskScore,
        JSON.stringify(monitoringResult.alerts),
        JSON.stringify(monitoringResult)
      ]);
    } catch (error) {
      logger.error('Error storing monitoring result', {
        error: error.message,
        monitoringResult
      });
      throw error;
    }
  }

  // Create Suspicious Activity Report (SAR)
  async createSAR(monitoringResult) {
    try {
      const sarNumber = this.generateSARNumber();
      
      await query(`
        INSERT INTO suspicious_activity_reports (
          sar_number, user_id, risk_score, alerts, 
          transaction_data, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
      `, [
        sarNumber,
        monitoringResult.transaction.userId,
        monitoringResult.riskScore,
        JSON.stringify(monitoringResult.alerts),
        JSON.stringify(monitoringResult.transaction)
      ]);

      logger.warn('SAR created', {
        sarNumber,
        userId: monitoringResult.transaction.userId,
        riskScore: monitoringResult.riskScore
      });

      return sarNumber;
    } catch (error) {
      logger.error('Error creating SAR', {
        error: error.message,
        monitoringResult
      });
      throw error;
    }
  }

  // Generate SAR number
  generateSARNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SAR-${year}-${random}`;
  }

  // Get AML monitoring history
  async getMonitoringHistory(filters = {}) {
    try {
      let queryStr = `
        SELECT 
          id, user_id, transaction_id, risk_score, alerts,
          created_at
        FROM aml_monitoring 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;

      if (filters.userId) {
        paramCount++;
        queryStr += ` AND user_id = $${paramCount}`;
        params.push(filters.userId);
      }

      if (filters.minRiskScore) {
        paramCount++;
        queryStr += ` AND risk_score >= $${paramCount}`;
        params.push(filters.minRiskScore);
      }

      if (filters.startDate) {
        paramCount++;
        queryStr += ` AND created_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        paramCount++;
        queryStr += ` AND created_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      queryStr += ' ORDER BY created_at DESC';

      if (filters.limit) {
        paramCount++;
        queryStr += ` LIMIT $${paramCount}`;
        params.push(filters.limit);
      }

      const result = await query(queryStr, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting monitoring history', {
        error: error.message,
        filters
      });
      throw error;
    }
  }

  // Get AML statistics
  async getAMLStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_monitoring,
          COUNT(CASE WHEN risk_score >= 80 THEN 1 END) as critical_risk,
          COUNT(CASE WHEN risk_score >= 50 AND risk_score < 80 THEN 1 END) as high_risk,
          COUNT(CASE WHEN risk_score >= 20 AND risk_score < 50 THEN 1 END) as medium_risk,
          COUNT(CASE WHEN risk_score < 20 THEN 1 END) as low_risk,
          AVG(risk_score) as average_risk_score,
          MAX(risk_score) as highest_risk_score
        FROM aml_monitoring 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const sarResult = await query(`
        SELECT 
          COUNT(*) as total_sars,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sars,
          COUNT(CASE WHEN status = 'filed' THEN 1 END) as filed_sars,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed_sars
        FROM suspicious_activity_reports 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      return {
        monitoring: result.rows[0],
        sars: sarResult.rows[0]
      };
    } catch (error) {
      logger.error('Error getting AML statistics', {
        error: error.message
      });
      throw error;
    }
  }

  // Update suspicious patterns configuration
  updateSuspiciousPatterns(patterns) {
    try {
      this.suspiciousPatterns = {
        ...this.suspiciousPatterns,
        ...patterns
      };

      logger.info('Suspicious patterns updated', {
        patterns
      });

      return this.suspiciousPatterns;
    } catch (error) {
      logger.error('Error updating suspicious patterns', {
        error: error.message,
        patterns
      });
      throw error;
    }
  }

  // Get current suspicious patterns
  getSuspiciousPatterns() {
    return this.suspiciousPatterns;
  }
}

export default new AMLMonitoringService();
