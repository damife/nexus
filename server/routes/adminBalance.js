import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/security.js';
import logger from '../config/logger.js';

const router = express.Router();

// Update user balance (add or deduct)
router.post('/balance', authenticateToken, requireRole('admin'), validateUserInput({
  userId: { type: 'number', required: true, min: 1 },
  amount: { type: 'number', required: true, min: 0.01, max: 1000000, decimals: 2 },
  type: { type: 'text', required: true, pattern: '^(add|deduct)$' },
  description: { type: 'text', required: true, minLength: 1, maxLength: 500 }
}), async (req, res) => {
  const { userId, amount, type, description } = req.body;

  try {
    // Start transaction
    await query('BEGIN');

    // Get current user balance and info
    const userResult = await query(`
      SELECT id, name, email, balance
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const currentBalance = parseFloat(user.balance) || 0;
    let newBalance;

    if (type === 'add') {
      newBalance = currentBalance + amount;
    } else {
      if (currentBalance < amount) {
        await query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance for deduction'
        });
      }
      newBalance = currentBalance - amount;
    }

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
    `, [userId, amount, type, currentBalance, newBalance, description, req.user.id]);

    // Send email notification to user
    try {
      const emailService = require('../services/emailService.js').default;
      await emailService.sendBalanceUpdateEmail({
        to: user.email,
        userName: user.name,
        amount: amount,
        type: type,
        newBalance: newBalance,
        description: description,
        adminName: req.user.name
      });
    } catch (emailError) {
      logger.error('Error sending balance update email:', {
        userId,
        emailError: emailError.message
      });
      // Continue with the transaction even if email fails
    }

    await query('COMMIT');

    logger.info('User balance updated', {
      userId,
      adminId: req.user.id,
      amount,
      type,
      previousBalance: currentBalance,
      newBalance
    });

    res.json({
      success: true,
      message: `Balance ${type === 'add' ? 'added to' : 'deducted from'} user successfully`,
      data: {
        userId,
        previousBalance: currentBalance,
        newBalance,
        amount,
        type
      }
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating user balance:', error);
    logger.error('Error updating user balance', {
      userId,
      adminId: req.user.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user balance',
      error: error.message
    });
  }
});

// Get balance transaction history
router.get('/balance-history', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId, limit = 50, offset = 0 } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    if (userId) {
      whereClause = 'WHERE bt.user_id = $1';
      queryParams.push(userId);
    }
    
    const result = await query(`
      SELECT 
        bt.id,
        bt.user_id,
        u.name as user_name,
        u.email as user_email,
        bt.amount,
        bt.type,
        bt.previous_balance,
        bt.new_balance,
        bt.description,
        bt.created_at,
        admin.name as admin_name
      FROM balance_transactions bt
      JOIN users u ON bt.user_id = u.id
      JOIN users admin ON bt.created_by = admin.id
      ${whereClause}
      ORDER BY bt.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM balance_transactions bt
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching balance history:', error);
    logger.error('Error fetching balance history', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance history',
      error: error.message
    });
  }
});

// Get user balance summary
router.get('/balance-summary', authenticateToken, requireRole('admin'), async (req, res) => {
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

    const recentTransactions = await query(`
      SELECT 
        bt.id,
        bt.user_id,
        u.name as user_name,
        bt.amount,
        bt.type,
        bt.created_at
      FROM balance_transactions bt
      JOIN users u ON bt.user_id = u.id
      ORDER BY bt.created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: result.rows[0],
      recentTransactions: recentTransactions.rows
    });

  } catch (error) {
    console.error('Error fetching balance summary:', error);
    logger.error('Error fetching balance summary', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance summary',
      error: error.message
    });
  }
});

// Get user balance by ID
router.get('/user/:userId/balance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await query(`
      SELECT 
        id,
        name,
        email,
        balance,
        updated_at as last_updated
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    // Get recent balance transactions for this user
    const transactionsResult = await query(`
      SELECT 
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        created_at
      FROM balance_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      success: true,
      user: {
        ...user,
        balance: parseFloat(user.balance) || 0
      },
      recentTransactions: transactionsResult.rows
    });

  } catch (error) {
    console.error('Error fetching user balance:', error);
    logger.error('Error fetching user balance', {
      userId: req.params.userId,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user balance',
      error: error.message
    });
  }
});

// Bulk balance update
router.post('/bulk-balance-update', authenticateToken, requireRole('admin'), validateUserInput({
  userIds: { type: 'text', required: true }, // JSON string array
  amount: { type: 'number', required: true, min: 0.01, max: 1000000, decimals: 2 },
  type: { type: 'text', required: true, pattern: '^(add|deduct)$' },
  description: { type: 'text', required: true, minLength: 1, maxLength: 500 }
}), async (req, res) => {
  const { userIds, amount, type, description } = req.body;

  try {
    const userIdArray = JSON.parse(userIds);
    
    if (!Array.isArray(userIdArray) || userIdArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user IDs array'
      });
    }

    // Start transaction
    await query('BEGIN');

    const results = [];
    let failedUsers = [];

    for (const userId of userIdArray) {
      try {
        // Get current user balance
        const userResult = await query(`
          SELECT id, name, email, balance
          FROM users 
          WHERE id = $1
        `, [userId]);

        if (userResult.rows.length === 0) {
          failedUsers.push({ userId, reason: 'User not found' });
          continue;
        }

        const user = userResult.rows[0];
        const currentBalance = parseFloat(user.balance) || 0;
        let newBalance;

        if (type === 'add') {
          newBalance = currentBalance + amount;
        } else {
          if (currentBalance < amount) {
            failedUsers.push({ userId, userName: user.name, reason: 'Insufficient balance' });
            continue;
          }
          newBalance = currentBalance - amount;
        }

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
        `, [userId, amount, type, currentBalance, newBalance, description, req.user.id]);

        results.push({
          userId,
          userName: user.name,
          previousBalance: currentBalance,
          newBalance
        });

      } catch (userError) {
        failedUsers.push({ userId, reason: userError.message });
      }
    }

    await query('COMMIT');

    logger.info('Bulk balance update completed', {
      adminId: req.user.id,
      amount,
      type,
      totalUsers: userIdArray.length,
      successful: results.length,
      failed: failedUsers.length
    });

    res.json({
      success: true,
      message: `Bulk balance update completed. ${results.length} successful, ${failedUsers.length} failed`,
      data: {
        successful: results,
        failed: failedUsers
      }
    });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error in bulk balance update:', error);
    logger.error('Error in bulk balance update', {
      adminId: req.user.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to complete bulk balance update',
      error: error.message
    });
  }
});

export default router;
