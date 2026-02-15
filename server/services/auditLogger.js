import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Audit Logger Service
 * Creates immutable audit trail for all financial transactions and user actions
 * Critical for compliance, reconciliation, and regulatory scrutiny
 */
class AuditLogger {
  /**
   * Log payment state change
   * @param {String} paymentId - Payment/message ID
   * @param {String} fromState - Previous state
   * @param {String} toState - New state
   * @param {Number} userId - User who made the change
   * @param {Object} metadata - Additional metadata
   */
  async logStateChange(paymentId, fromState, toState, userId, metadata = {}) {
    try {
      await query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, from_state, to_state,
          user_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        'payment',
        paymentId,
        'state_change',
        fromState,
        toState,
        userId,
        JSON.stringify(metadata)
      ]);

      logger.info('Payment state change logged', {
        paymentId,
        fromState,
        toState,
        userId
      });
    } catch (error) {
      logger.error('Error logging state change', { error: error.message, paymentId });
    }
  }

  /**
   * Log user action
   * @param {String} action - Action performed
   * @param {Number} userId - User who performed action
   * @param {String} resourceType - Type of resource
   * @param {String} resourceId - Resource ID
   * @param {Object} metadata - Additional metadata
   */
  async logUserAction(action, userId, resourceType, resourceId = null, metadata = {}) {
    try {
      await query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, user_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        resourceType,
        resourceId,
        action,
        userId,
        JSON.stringify(metadata)
      ]);

      logger.info('User action logged', {
        action,
        userId,
        resourceType,
        resourceId
      });
    } catch (error) {
      logger.error('Error logging user action', { error: error.message });
    }
  }

  /**
   * Log message processing stage
   * @param {String} paymentId - Payment/message ID
   * @param {String} stage - Processing stage (received, validated, screened, sent, acknowledged)
   * @param {String} status - Status (success, failed, warning)
   * @param {Number} userId - User ID (if applicable)
   * @param {Object} details - Additional details
   */
  async logProcessingStage(paymentId, stage, status, userId = null, details = {}) {
    try {
      await query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, to_state, user_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        'payment',
        paymentId,
        `processing_${stage}`,
        status,
        userId,
        JSON.stringify({ stage, status, ...details })
      ]);

      logger.info('Processing stage logged', {
        paymentId,
        stage,
        status,
        userId
      });
    } catch (error) {
      logger.error('Error logging processing stage', { error: error.message, paymentId });
    }
  }

  /**
   * Get audit trail for a payment
   * @param {String} paymentId - Payment/message ID
   * @returns {Array} Audit log entries
   */
  async getAuditTrail(paymentId) {
    try {
      const result = await query(`
        SELECT 
          al.*,
          u.name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = 'payment' AND al.entity_id = $1
        ORDER BY al.created_at ASC
      `, [paymentId]);

      return result.rows;
    } catch (error) {
      logger.error('Error retrieving audit trail', { error: error.message, paymentId });
      return [];
    }
  }

  /**
   * Get audit trail for a user
   * @param {Number} userId - User ID
   * @param {Number} limit - Number of records to return
   * @returns {Array} Audit log entries
   */
  async getUserAuditTrail(userId, limit = 100) {
    try {
      const result = await query(`
        SELECT *
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error retrieving user audit trail', { error: error.message, userId });
      return [];
    }
  }
}

export default new AuditLogger();

