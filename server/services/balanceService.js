import { query } from '../config/database.js';
import logger from '../config/logger.js';

/**
 * Balance Service
 * Manages user account balances and transactions
 */
class BalanceService {
  /**
   * Get user balance
   * @param {Number} userId - User ID
   * @returns {Object} Balance information
   */
  async getBalance(userId) {
    try {
      const result = await query(
        'SELECT balance FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return {
        balance: parseFloat(result.rows[0].balance || 0),
        currency: 'USD'
      };
    } catch (error) {
      logger.error('Error getting balance', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance
   * @param {Number} userId - User ID
   * @param {Number} amount - Required amount
   * @returns {Boolean} True if sufficient
   */
  async hasSufficientBalance(userId, amount) {
    try {
      const balance = await this.getBalance(userId);
      return balance.balance >= amount;
    } catch (error) {
      logger.error('Error checking balance', { userId, amount, error: error.message });
      return false;
    }
  }

  /**
   * Deduct fee from user balance
   * @param {Number} userId - User ID
   * @param {Number} amount - Amount to deduct
   * @param {String} reference - Transaction reference
   * @param {String} paymentId - Payment ID
   * @returns {Object} Transaction result
   */
  async deductFee(userId, amount, reference, paymentId) {
    try {
      // Get current balance
      const balanceResult = await query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const balanceBefore = parseFloat(balanceResult.rows[0].balance || 0);

      if (balanceBefore < amount) {
        throw new Error('Insufficient balance');
      }

      const balanceAfter = balanceBefore - amount;

      // Update balance
      await query(
        'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [balanceAfter, userId]
      );

      // Record transaction
      await query(`
        INSERT INTO user_balances (
          user_id, transaction_type, amount, balance_before, balance_after,
          reference, payment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, 'fee', amount, balanceBefore, balanceAfter, reference, paymentId]);

      logger.info('Fee deducted', { userId, amount, balanceBefore, balanceAfter, paymentId });

      return {
        success: true,
        balanceBefore,
        balanceAfter,
        amountDeducted: amount
      };
    } catch (error) {
      logger.error('Error deducting fee', { userId, amount, error: error.message });
      throw error;
    }
  }

  /**
   * Add balance to user account
   * @param {Number} userId - User ID
   * @param {Number} amount - Amount to add
   * @param {String} reference - Transaction reference
   * @param {String} paymentId - Payment ID
   * @returns {Object} Transaction result
   */
  async addBalance(userId, amount, reference, paymentId) {
    try {
      // Get current balance
      const balanceResult = await query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const balanceBefore = parseFloat(balanceResult.rows[0].balance || 0);
      const balanceAfter = balanceBefore + amount;

      // Update balance
      await query(
        'UPDATE users SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [balanceAfter, userId]
      );

      // Record transaction
      await query(`
        INSERT INTO user_balances (
          user_id, transaction_type, amount, balance_before, balance_after,
          reference, payment_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, 'deposit', amount, balanceBefore, balanceAfter, reference, paymentId]);

      logger.info('Balance added', { userId, amount, balanceBefore, balanceAfter, paymentId });

      return {
        success: true,
        balanceBefore,
        balanceAfter,
        amountAdded: amount
      };
    } catch (error) {
      logger.error('Error adding balance', { userId, amount, error: error.message });
      throw error;
    }
  }

  /**
   * Get transaction history
   * @param {Number} userId - User ID
   * @param {Number} limit - Number of records
   * @returns {Array} Transaction history
   */
  async getTransactionHistory(userId, limit = 50) {
    try {
      const result = await query(`
        SELECT * FROM user_balances
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting transaction history', { userId, error: error.message });
      return [];
    }
  }
}

export default new BalanceService();

