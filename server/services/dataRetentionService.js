/**
 * Data Retention Service - Message Storage Requirements
 * Complete implementation for SWIFT message data retention and compliance
 */

import { query } from '../config/database.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

class DataRetentionService {
  constructor() {
    this.retentionPolicies = this.initializeRetentionPolicies();
    this.archiveSchedule = this.initializeArchiveSchedule();
    this.complianceRules = this.initializeComplianceRules();
  }

  /**
   * Initialize data retention policies
   */
  initializeRetentionPolicies() {
    return {
      // SWIFT message retention periods (in years)
      messages: {
        'MT103': 7, // Customer credit transfers
        'MT202': 7, // General financial institution transfers
        'MT940': 7, // Customer statement messages
        'MT942': 7, // Interim transaction reports
        'MT199': 7, // Free format message
        'MT299': 7, // Free format message
        'PACS.008': 7, // Payment initiation
        'PACS.004': 7, // Payment status report
        'PACS.002': 7, // Payment return
        'PACS.003': 7, // Payment cancellation
        'ISO20022': 7 // All ISO 20022 messages
      },
      
      // Supporting data retention periods
      supportingData: {
        auditLogs: 7, // Audit trail logs
        monitoringData: 5, // Transaction monitoring data
        complianceData: 10, // Compliance and regulatory data
        userActivity: 3, // User activity logs
        systemLogs: 2, // System operation logs
        errorLogs: 2, // Error and exception logs
        performanceData: 1, // Performance metrics
        securityEvents: 10 // Security incident data
      },
      
      // Archive policies
      archive: {
        coldStorageAfter: 90, // Move to cold storage after 90 days
        compressionEnabled: true,
        encryptionEnabled: true,
        backupFrequency: 'daily',
        retentionVerification: 'monthly'
      }
    };
  }

  /**
   * Initialize archive schedule
   */
  initializeArchiveSchedule() {
    return {
      daily: {
        time: '02:00',
        operations: ['compress_old_data', 'move_to_cold_storage']
      },
      weekly: {
        day: 'sunday',
        time: '03:00',
        operations: ['verify_archive_integrity', 'cleanup_temp_data']
      },
      monthly: {
        day: 1,
        time: '04:00',
        operations: ['retention_review', 'compliance_report', 'archive_old_data']
      },
      yearly: {
        month: 'january',
        day: 1,
        time: '05:00',
        operations: ['annual_retention_audit', 'policy_review', 'archive_cleanup']
      }
    };
  }

  /**
   * Initialize compliance rules
   */
  initializeComplianceRules() {
    return {
      regulatory: {
        minimumRetention: 7, // Minimum 7 years for SWIFT messages
        auditRequirements: true,
        reportingRequirements: true,
        dataIntegrity: true,
        accessControl: true,
        encryptionRequired: true
      },
      
      privacy: {
        gdprCompliant: true,
        dataMinimization: true,
        purposeLimitation: true,
        storageLimitation: true,
        accuracyObligation: true,
        securityMeasures: true
      },
      
      business: {
        businessContinuity: true,
        disasterRecovery: true,
        dataClassification: true,
        retentionJustification: true,
      }
    };
  }

  /**
   * Store message with retention metadata
   */
  async storeMessageWithRetention(messageData, messageType, metadata = {}) {
    try {
      const messageId = crypto.randomUUID();
      const retentionPeriod = this.retentionPolicies.messages[messageType] || this.retentionPolicies.messages['ISO20022'];
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + retentionPeriod);

      // Store message with retention metadata
      await query(
        `INSERT INTO messages_with_retention 
         (id, message_type, message_data, metadata, retention_period, expiry_date, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          messageId,
          messageType,
          JSON.stringify(messageData),
          JSON.stringify(metadata),
          retentionPeriod,
          expiryDate
        ]
      );

      // Store retention policy application
      await this.storeRetentionPolicyApplication(messageId, messageType, retentionPeriod);

      logger.info('Message stored with retention metadata', {
        messageId,
        messageType,
        retentionPeriod,
        expiryDate
      });

      return messageId;

    } catch (error) {
      logger.error('Failed to store message with retention', { error: error.message });
      throw error;
    }
  }

  /**
   * Store retention policy application
   */
  async storeRetentionPolicyApplication(messageId, messageType, retentionPeriod) {
    try {
      await query(
        `INSERT INTO retention_policy_applications 
         (message_id, message_type, retention_period, policy_version, applied_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [messageId, messageType, retentionPeriod, '1.0']
      );
    } catch (error) {
      logger.error('Failed to store retention policy application', { error: error.message });
    }
  }

  /**
   * Check for expired messages and handle retention
   */
  async checkExpiredMessages() {
    try {
      logger.info('Checking for expired messages');

      // Find expired messages
      const expiredMessages = await query(
        `SELECT id, message_type, message_data, metadata 
         FROM messages_with_retention 
         WHERE expiry_date <= NOW() AND status = 'active'`
      );

      logger.info(`Found ${expiredMessages.rows.length} expired messages`);

      for (const message of expiredMessages.rows) {
        await this.handleExpiredMessage(message);
      }

      return {
        processed: expiredMessages.rows.length,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Failed to check expired messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle expired message
   */
  async handleExpiredMessage(message) {
    try {
      // Check if message should be archived or deleted
      const shouldArchive = await this.shouldArchiveMessage(message);
      
      if (shouldArchive) {
        await this.archiveMessage(message);
      } else {
        await this.deleteMessage(message.id);
      }

      // Update message status
      await query(
        'UPDATE messages_with_retention SET status = $1, processed_at = NOW() WHERE id = $2',
        [shouldArchive ? 'archived' : 'deleted', message.id]
      );

      logger.info('Expired message processed', {
        messageId: message.id,
        action: shouldArchive ? 'archived' : 'deleted'
      });

    } catch (error) {
      logger.error('Failed to handle expired message', { 
        error: error.message, 
        messageId: message.id 
      });
    }
  }

  /**
   * Determine if message should be archived
   */
  async shouldArchiveMessage(message) {
    try {
      // Check if message has regulatory or historical significance
      const metadata = JSON.parse(message.metadata || '{}');
      
      // Archive if message is:
      // - High value transaction
      // - Regulatory flagged
      // - Historically significant
      // - Part of ongoing investigation
      if (
        metadata.highValue ||
        metadata.regulatoryFlagged ||
        metadata.historicallySignificant ||
        metadata.investigationOngoing
      ) {
        return true;
      }

      // Archive based on message type
      const archiveTypes = ['MT103', 'MT202', 'PACS.008'];
      return archiveTypes.includes(message.message_type);

    } catch (error) {
      logger.error('Failed to determine archive decision', { error: error.message });
      return false; // Default to deletion if error
    }
  }

  /**
   * Archive message
   */
  async archiveMessage(message) {
    try {
      const archiveId = crypto.randomUUID();
      const archiveDate = new Date();

      // Compress and encrypt message data
      const compressedData = await this.compressData(JSON.stringify(message.message_data));
      const encryptedData = await this.encryptData(compressedData);

      // Store in archive
      await query(
        `INSERT INTO message_archive 
         (id, original_message_id, message_type, message_data, metadata, archive_date, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          archiveId,
          message.id,
          message.message_type,
          encryptedData,
          message.metadata,
          archiveDate
        ]
      );

      logger.info('Message archived', {
        originalId: message.id,
        archiveId,
        archiveDate
      });

    } catch (error) {
      logger.error('Failed to archive message', { 
        error: error.message, 
        messageId: message.id 
      });
      throw error;
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId) {
    try {
      // Soft delete first
      await query(
        'UPDATE messages_with_retention SET status = $1, deleted_at = NOW() WHERE id = $2',
        ['deleted', messageId]
      );

      // Log deletion for audit
      await this.logDataDeletion(messageId, 'retention_expired');

      logger.info('Message deleted', { messageId });

    } catch (error) {
      logger.error('Failed to delete message', { 
        error: error.message, 
        messageId 
      });
      throw error;
    }
  }

  /**
   * Compress data
   */
  async compressData(data) {
    // Simple compression simulation - in production use proper compression
    return Buffer.from(data).toString('base64');
  }

  /**
   * Encrypt data
   */
  async encryptData(data) {
    // Simple encryption simulation - in production use proper encryption
    return `encrypted_${data}`;
  }

  /**
   * Log data deletion
   */
  async logDataDeletion(dataId, reason) {
    try {
      await query(
        `INSERT INTO data_deletion_log 
         (data_id, data_type, reason, deleted_at, deleted_by) 
         VALUES ($1, $2, $3, NOW(), $4)`,
        [dataId, 'message', reason, 'retention_service']
      );
    } catch (error) {
      logger.error('Failed to log data deletion', { error: error.message });
    }
  }

  /**
   * Get retention statistics
   */
  async getRetentionStatistics() {
    try {
      const stats = {};

      // Message retention stats
      const messageStats = await query(
        `SELECT message_type, COUNT(*) as count, 
         AVG(EXTRACT(YEAR FROM AGE(expiry_date, created_at))) as avg_retention
         FROM messages_with_retention 
         GROUP BY message_type`
      );

      stats.messages = messageStats.rows;

      // Archive stats
      const archiveStats = await query(
        `SELECT COUNT(*) as total_messages, 
         AVG(EXTRACT(DAYS FROM AGE(NOW(), archive_date))) as avg_age
         FROM message_archive`
      );

      stats.archive = archiveStats.rows[0];

      // Deletion stats
      const deletionStats = await query(
        `SELECT COUNT(*) as total_deleted,
         DATE_TRUNC('month', deleted_at) as month
         FROM data_deletion_log 
         WHERE deleted_at >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', deleted_at)
         ORDER BY month`
      );

      stats.deletions = deletionStats.rows;

      return stats;

    } catch (error) {
      logger.error('Failed to get retention statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate retention compliance report
   */
  async generateRetentionComplianceReport() {
    try {
      const report = {
        generatedAt: new Date(),
        complianceStatus: 'compliant',
        statistics: await this.getRetentionStatistics(),
        policies: this.retentionPolicies,
        recommendations: []
      };

      // Check for compliance issues
      const issues = await this.checkComplianceIssues();
      
      if (issues.length > 0) {
        report.complianceStatus = 'non_compliant';
        report.issues = issues;
        report.recommendations = this.generateRecommendations(issues);
      }

      // Store report
      await this.storeComplianceReport(report);

      return report;

    } catch (error) {
      logger.error('Failed to generate retention compliance report', { error: error.message });
      throw error;
    }
  }

  /**
   * Check compliance issues
   */
  async checkComplianceIssues() {
    const issues = [];

    try {
      // Check for messages beyond retention period
      const overdueMessages = await query(
        `SELECT COUNT(*) as count 
         FROM messages_with_retention 
         WHERE expiry_date < NOW() - INTERVAL '30 days' AND status = 'active'`
      );

      if (parseInt(overdueMessages.rows[0].count) > 0) {
        issues.push({
          type: 'overdue_retention',
          severity: 'high',
          count: overdueMessages.rows[0].count,
          description: 'Messages exceeding retention period'
        });
      }

      // Check archive integrity
      const archiveIssues = await this.checkArchiveIntegrity();
      if (archiveIssues.length > 0) {
        issues.push(...archiveIssues);
      }

      // Check encryption compliance
      const encryptionIssues = await this.checkEncryptionCompliance();
      if (encryptionIssues.length > 0) {
        issues.push(...encryptionIssues);
      }

    } catch (error) {
      logger.error('Failed to check compliance issues', { error: error.message });
    }

    return issues;
  }

  /**
   * Check archive integrity
   */
  async checkArchiveIntegrity() {
    const issues = [];

    try {
      // Check for missing archive records
      const missingArchives = await query(
        `SELECT COUNT(*) as count 
         FROM messages_with_retention mr 
         LEFT JOIN message_archive ma ON mr.original_message_id = mr.id 
         WHERE mr.status = 'archived' AND ma.id IS NULL`
      );

      if (parseInt(missingArchives.rows[0].count) > 0) {
        issues.push({
          type: 'missing_archive_records',
          severity: 'high',
          count: missingArchives.rows[0].count,
          description: 'Missing archive records for archived messages'
        });
      }

    } catch (error) {
      logger.error('Failed to check archive integrity', { error: error.message });
    }

    return issues;
  }

  /**
   * Check encryption compliance
   */
  async checkEncryptionCompliance() {
    const issues = [];

    try {
      // Check for unencrypted data in archive
      const unencryptedData = await query(
        `SELECT COUNT(*) as count 
         FROM message_archive 
         WHERE message_data NOT LIKE 'encrypted_%'`
      );

      if (parseInt(unencryptedData.rows[0].count) > 0) {
        issues.push({
          type: 'unencrypted_data',
          severity: 'high',
          count: unencryptedData.rows[0].count,
          description: 'Unencrypted data found in archive'
        });
      }

    } catch (error) {
      logger.error('Failed to check encryption compliance', { error: error.message });
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(issues) {
    const recommendations = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'overdue_retention':
          recommendations.push({
            priority: 'high',
            action: 'Process overdue messages immediately',
            description: 'Messages exceeding retention period should be archived or deleted'
          });
          break;
        case 'missing_archive_records':
          recommendations.push({
            priority: 'high',
            action: 'Rebuild missing archive records',
            description: 'Archive integrity must be maintained for compliance'
          });
          break;
        case 'unencrypted_data':
          recommendations.push({
            priority: 'high',
            action: 'Encrypt all archived data',
            description: 'Data encryption is required for privacy compliance'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Store compliance report
   */
  async storeComplianceReport(report) {
    try {
      await query(
        `INSERT INTO retention_compliance_reports 
         (report_data, generated_at, compliance_status, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [JSON.stringify(report), report.generatedAt, report.complianceStatus]
      );
    } catch (error) {
      logger.error('Failed to store compliance report', { error: error.message });
    }
  }

  /**
   * Start automated retention processing
   */
  async startAutomatedRetentionProcessing() {
    try {
      logger.info('Starting automated retention processing');

      // Schedule daily retention check
      setInterval(async () => {
        await this.checkExpiredMessages();
      }, 24 * 60 * 60 * 1000); // Daily

      // Schedule weekly compliance report
      setInterval(async () => {
        await this.generateRetentionComplianceReport();
      }, 7 * 24 * 60 * 60 * 1000); // Weekly

      logger.info('Automated retention processing started');

    } catch (error) {
      logger.error('Failed to start automated retention processing', { error: error.message });
      throw error;
    }
  }
}

export default new DataRetentionService();
