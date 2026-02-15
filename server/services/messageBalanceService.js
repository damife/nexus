import { query } from '../config/database.js';
import feeService from './feeService.js';
import logger from '../config/logger.js';

class MessageBalanceService {
  /**
   * Deduct balance from user when sending message
   */
  async deductMessageBalance(userId, messageType, amount = null) {
    try {
      // Start transaction
      await query('BEGIN');

      // Get user's current balance
      const userResult = await query(`
        SELECT id, name, email, balance
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const currentBalance = parseFloat(user.balance) || 0;

      // Get message fee
      let fee = 0;
      if (amount) {
        // For messages with amounts (like MT103), calculate percentage-based fee
        const feeConfig = await feeService.getFee(messageType);
        if (feeConfig && feeConfig.is_active) {
          fee = parseFloat(feeConfig.amount) || 0;
          // If fee is percentage, calculate based on amount
          if (feeConfig.amount < 1) {
            fee = amount * fee;
          }
        }
      } else {
        // Fixed fee for messages without amounts
        const feeConfig = await feeService.getFee(messageType);
        fee = feeConfig && feeConfig.is_active ? parseFloat(feeConfig.amount) || 0 : 0;
      }

      // Check if user has sufficient balance
      if (currentBalance < fee) {
        await query('ROLLBACK');
        throw new Error(`Insufficient balance. Required: $${fee.toFixed(2)}, Available: $${currentBalance.toFixed(2)}`);
      }

      // Deduct balance
      const newBalance = currentBalance - fee;
      
      await query(`
        UPDATE users 
        SET balance = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newBalance, userId]);

      // Create balance transaction record
      await query(`
        INSERT INTO balance_transactions 
        (user_id, amount, type, previous_balance, new_balance, description, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [userId, fee, 'deduct', currentBalance, newBalance, `Message fee for ${messageType}`, userId]);

      await query('COMMIT');

      logger.info('Message balance deducted', {
        userId,
        messageType,
        fee,
        previousBalance: currentBalance,
        newBalance
      });

      return {
        success: true,
        fee,
        previousBalance: currentBalance,
        newBalance
      };

    } catch (error) {
      await query('ROLLBACK');
      logger.error('Error deducting message balance', {
        userId,
        messageType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's current balance
   */
  async getUserBalance(userId) {
    try {
      const result = await query(`
        SELECT balance, updated_at as last_updated
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return {
        balance: parseFloat(result.rows[0].balance) || 0,
        lastUpdated: result.rows[0].last_updated
      };
    } catch (error) {
      logger.error('Error getting user balance', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Add balance to user account (for crypto deposits)
   */
  async addBalance(userId, amount, description, transactionId = null) {
    try {
      // Start transaction
      await query('BEGIN');

      // Get user's current balance
      const userResult = await query(`
        SELECT id, name, email, balance
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const currentBalance = parseFloat(user.balance) || 0;
      const newBalance = currentBalance + amount;

      // Update user balance
      await query(`
        UPDATE users 
        SET balance = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newBalance, userId]);

      // Create balance transaction record
      await query(`
        INSERT INTO balance_transactions 
        (user_id, amount, type, previous_balance, new_balance, description, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [userId, amount, 'add', currentBalance, newBalance, description, userId]);

      await query('COMMIT');

      logger.info('Balance added to user account', {
        userId,
        amount,
        transactionId,
        previousBalance: currentBalance,
        newBalance
      });

      // Send email notification
      try {
        const emailService = require('./emailService.js').default;
        await emailService.sendDepositConfirmationEmail({
          to: user.email,
          userName: user.name,
          amount: amount,
          newBalance: newBalance,
          transactionId: transactionId
        });
      } catch (emailError) {
        logger.error('Error sending deposit confirmation email', {
          userId,
          emailError: emailError.message
        });
        // Continue with the transaction even if email fails
      }

      return {
        success: true,
        previousBalance: currentBalance,
        newBalance
      };

    } catch (error) {
      await query('ROLLBACK');
      logger.error('Error adding balance', {
        userId,
        amount,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance for message
   */
  async checkSufficientBalance(userId, messageType, amount = null) {
    try {
      const userBalance = await this.getUserBalance(userId);
      
      // Calculate required fee
      let fee = 0;
      if (amount) {
        const feeConfig = await feeService.getFee(messageType);
        if (feeConfig && feeConfig.is_active) {
          fee = parseFloat(feeConfig.amount) || 0;
          if (feeConfig.amount < 1) {
            fee = amount * fee;
          }
        }
      } else {
        const feeConfig = await feeService.getFee(messageType);
        fee = feeConfig && feeConfig.is_active ? parseFloat(feeConfig.amount) || 0 : 0;
      }

      return {
        sufficient: userBalance.balance >= fee,
        required: fee,
        available: userBalance.balance,
        shortfall: Math.max(0, fee - userBalance.balance)
      };

    } catch (error) {
      logger.error('Error checking sufficient balance', {
        userId,
        messageType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get message fee for a specific message type
   */
  async getMessageFee(messageType, amount = null) {
    try {
      const feeConfig = await feeService.getFee(messageType);
      
      if (!feeConfig || !feeConfig.is_active) {
        return 0;
      }

      let fee = parseFloat(feeConfig.amount) || 0;
      
      // If fee is percentage and amount is provided
      if (amount && fee < 1) {
        fee = amount * fee;
      }

      return fee;

    } catch (error) {
      logger.error('Error getting message fee', {
        messageType,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get user's balance transaction history
   */
  async getBalanceHistory(userId, limit = 50, offset = 0) {
    try {
      const result = await query(`
        SELECT 
          id,
          amount,
          type,
          previous_balance,
          new_balance,
          description,
          created_at
        FROM balance_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      // Get total count
      const countResult = await query(`
        SELECT COUNT(*) as total
        FROM balance_transactions
        WHERE user_id = $1
      `, [userId]);

      return {
        transactions: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      };

    } catch (error) {
      logger.error('Error getting balance history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get system-wide balance statistics
   */
  async getBalanceStatistics() {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE balance > 0) as users_with_balance,
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(AVG(balance), 0) as average_balance,
          COALESCE(MAX(balance), 0) as highest_balance,
          COALESCE(MIN(balance), 0) as lowest_balance
        FROM users
        WHERE status = 'active'
      `);

      return result.rows[0];

    } catch (error) {
      logger.error('Error getting balance statistics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Refund message fee (for failed messages)
   */
  async refundMessageFee(userId, messageId, amount) {
    try {
      // Start transaction
      await query('BEGIN');

      // Get user's current balance
      const userResult = await query(`
        SELECT id, name, email, balance
        FROM users 
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        await query('ROLLBACK');
        throw new Error('User not found');
      }

      const user = userResult.rows[0];
      const currentBalance = parseFloat(user.balance) || 0;
      const newBalance = currentBalance + amount;

      // Update user balance
      await query(`
        UPDATE users 
        SET balance = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newBalance, userId]);

      // Create balance transaction record
      await query(`
        INSERT INTO balance_transactions 
        (user_id, amount, type, previous_balance, new_balance, description, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [userId, amount, 'add', currentBalance, newBalance, `Refund for failed message ${messageId}`, userId]);

      await query('COMMIT');

      logger.info('Message fee refunded', {
        userId,
        messageId,
        amount,
        previousBalance: currentBalance,
        newBalance
      });

      return {
        success: true,
        previousBalance: currentBalance,
        newBalance
      };

    } catch (error) {
      await query('ROLLBACK');
      logger.error('Error refunding message fee', {
        userId,
        messageId,
        amount,
        error: error.message
      });
      throw error;
    }
  }
}

export default new MessageBalanceService();
