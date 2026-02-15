import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Fee Service
 * Manages message fees (admin configurable)
 */
class FeeService {
  /**
   * Get fee for message type
   * @param {String} messageType - Message type (MT103, MT202, etc.)
   * @returns {Number} Fee amount
   */
  async getFee(messageType) {
    try {
      const result = await query(
        'SELECT fee_amount, currency FROM message_fees WHERE message_type = $1 AND is_active = TRUE',
        [messageType]
      );

      if (result.rows.length === 0) {
        // Default fee if not configured
        logger.warn('Fee not configured for message type', { messageType });
        return { amount: 30.50, currency: 'USD' };
      }

      return {
        amount: parseFloat(result.rows[0].fee_amount),
        currency: result.rows[0].currency || 'USD'
      };
    } catch (error) {
      logger.error('Error getting fee', { messageType, error: error.message });
      return { amount: 30.50, currency: 'USD' }; // Default fallback
    }
  }

  /**
   * Set fee for message type (admin only)
   * @param {String} messageType - Message type
   * @param {Number} amount - Fee amount
   * @param {String} currency - Currency code
   * @returns {Object} Updated fee
   */
  async setFee(messageType, amount, currency = 'USD') {
    try {
      await query(`
        INSERT INTO message_fees (message_type, fee_amount, currency, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (message_type) 
        DO UPDATE SET 
          fee_amount = $2,
          currency = $3,
          updated_at = CURRENT_TIMESTAMP
      `, [messageType, amount, currency]);

      logger.info('Fee updated', { messageType, amount, currency });

      return { messageType, amount, currency };
    } catch (error) {
      logger.error('Error setting fee', { messageType, amount, error: error.message });
      throw error;
    }
  }

  /**
   * Get all fees
   * @returns {Array} All message fees
   */
  async getAllFees() {
    try {
      const result = await query(
        'SELECT * FROM message_fees ORDER BY message_type'
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting all fees', { error: error.message });
      return [];
    }
  }

  /**
   * Toggle fee active status
   * @param {String} messageType - Message type
   * @param {Boolean} isActive - Active status
   */
  async toggleFee(messageType, isActive) {
    try {
      await query(
        'UPDATE message_fees SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE message_type = $2',
        [isActive, messageType]
      );

      logger.info('Fee toggled', { messageType, isActive });
    } catch (error) {
      logger.error('Error toggling fee', { messageType, error: error.message });
      throw error;
    }
  }
}

export default new FeeService();

