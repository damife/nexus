import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

// Update user balance (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { userId, amount, type = 'add', description } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId and amount are required'
      });
    }

    const updateAmount = type === 'add' ? amount : -amount;

    await query('BEGIN');

    try {
      // Update user balance
      const result = await query(`
        UPDATE users 
        SET balance = balance + $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, balance, name, email
      `, [updateAmount, userId]);

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Create balance transaction record
      await query(`
        INSERT INTO balance_transactions (
          user_id, amount, type, description, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [userId, amount, type, description || 'Balance adjustment']);

      await query('COMMIT');

      logger.info('Balance updated', {
        adminId: req.user.id,
        userId,
        amount,
        type,
        newBalance: result.rows[0].balance
      });

      res.json({
        success: true,
        message: `Balance ${type === 'add' ? 'added to' : 'deducted from'} user successfully`,
        data: {
          userId: result.rows[0].id,
          name: result.rows[0].name,
          email: result.rows[0].email,
          newBalance: parseFloat(result.rows[0].balance),
          adjustment: parseFloat(updateAmount)
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Balance update error', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update balance'
    });
  }
});

export default router;
