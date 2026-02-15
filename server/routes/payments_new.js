import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import { validateUserInput } from '../middleware/security.js';

const router = express.Router();

// Create new payment
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      recipientBIC,
      recipientAccount,
      amount,
      currency,
      reference,
      paymentType = 'SWIFT'
    } = req.body;

    const userId = req.user.id;

    // Validate balance
    const userResult = await query(
      'SELECT balance, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userBalance = parseFloat(userResult.rows[0].balance);
    const paymentAmount = parseFloat(amount);

    if (userBalance < paymentAmount) {
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance for this payment',
        data: {
          currentBalance: userBalance,
          requiredAmount: paymentAmount,
          shortfall: paymentAmount - userBalance
        }
      });
    }

    // Check for duplicate payment (same payment within 5 minutes)
    const duplicateCheck = await query(`
      SELECT COUNT(*) as count
      FROM payments 
      WHERE sender_id = $1 
      AND recipient_bic = $2 
      AND amount = $3 
      AND created_at > NOW() - INTERVAL '5 minutes'
    `, [userId, recipientBIC, paymentAmount]);

    if (duplicateCheck.rows[0].count > 0) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_PAYMENT',
        message: 'Duplicate payment detected'
      });
    }

    // Generate transaction reference
    const transactionRef = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start transaction
    await query('BEGIN');

    try {
      // Deduct from sender
      await query(
        'UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
        [paymentAmount, userId]
      );

      // Create payment record
      const paymentResult = await query(`
        INSERT INTO payments (
          sender_id, recipient_bic, recipient_account, amount, 
          currency, reference, transaction_ref, payment_type, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
        RETURNING id, transaction_ref, created_at
      `, [
        userId, recipientBIC, recipientAccount, paymentAmount,
        currency, reference, transactionRef, paymentType
      ]);

      // Create SWIFT message
      const swiftContent = `Payment: ${reference} | Amount: ${amount} ${currency} | Account: ${recipientAccount}`;
      await query(`
        INSERT INTO messages (
          message_type, sender_bic, receiver_bic, content, 
          priority, user_id, amount, currency, utr, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')
      `, [
        'MT103', 'TESTBICXXX', recipientBIC, 
        swiftContent, 'normal', userId, 
        paymentAmount, currency, transactionRef
      ]);

      await query('COMMIT');

      logger.info('Payment created successfully', {
        userId,
        transactionRef,
        amount: paymentAmount,
        currency,
        recipientBIC
      });

      res.json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          paymentId: paymentResult.rows[0].id,
          transactionRef: paymentResult.rows[0].transaction_ref,
          amount: paymentAmount,
          currency: currency,
          status: 'pending',
          createdAt: paymentResult.rows[0].created_at
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Payment creation error', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      message: 'Payment failed',
      error: error.message
    });
  }
});

// Get user balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        balance,
        updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: parseFloat(result.rows[0].balance),
        lastUpdated: result.rows[0].updated_at
      }
    });

  } catch (error) {
    logger.error('Balance check error', { 
      error: error.message,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get balance'
    });
  }
});

// Get payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status,
      startDate,
      endDate 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE p.sender_id = $1';
    const params = [userId];

    if (status) {
      whereClause += ' AND p.status = $' + (params.length + 1);
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND p.created_at >= $' + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND p.created_at <= $' + (params.length + 1);
      params.push(endDate);
    }

    const result = await query(`
      SELECT 
        p.id,
        p.transaction_ref,
        p.recipient_bic,
        p.recipient_account,
        p.amount,
        p.currency,
        p.reference,
        p.payment_type,
        p.status,
        p.created_at,
        p.settled_at
      FROM payments p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM payments p
      ${whereClause}
    `, params);

    const totalPages = Math.ceil(countResult.rows[0].total / parseInt(limit));

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Payment history error', { 
      error: error.message,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
});

// Get payment statistics (admin only)
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    let timeCondition = '';
    if (period === '24h') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'24 hours\'';
    } else if (period === '7d') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (period === '30d') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
      FROM payments
      WHERE 1=1 ${timeCondition}
    `);

    const currencyBreakdown = await query(`
      SELECT 
        currency,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      WHERE 1=1 ${timeCondition}
      GROUP BY currency
      ORDER BY total_amount DESC
    `);

    res.json({
      success: true,
      data: {
        period,
        stats: result.rows[0],
        currencyBreakdown: currencyBreakdown.rows
      }
    });

  } catch (error) {
    logger.error('Payment stats error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics'
    });
  }
});

// Get payment status
router.get('/:transactionRef', authenticate, async (req, res) => {
  try {
    const { transactionRef } = req.params;
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        p.id,
        p.transaction_ref,
        p.amount,
        p.currency,
        p.reference,
        p.payment_type,
        p.status,
        p.created_at,
        p.updated_at,
        p.settled_at,
        p.recipient_bic,
        p.recipient_account,
        u.name as sender_name,
        u.email as sender_email
      FROM payments p
      JOIN users u ON p.sender_id = u.id
      WHERE p.transaction_ref = $1 AND p.sender_id = $2
    `, [transactionRef, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Payment status error', { 
      error: error.message,
      transactionRef: req.params.transactionRef 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status'
    });
  }
});

// Get payment history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status,
      startDate,
      endDate 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = 'WHERE p.sender_id = $1';
    const params = [userId];

    if (status) {
      whereClause += ' AND p.status = $' + (params.length + 1);
      params.push(status);
    }

    if (startDate) {
      whereClause += ' AND p.created_at >= $' + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND p.created_at <= $' + (params.length + 1);
      params.push(endDate);
    }

    const result = await query(`
      SELECT 
        p.id,
        p.transaction_ref,
        p.recipient_bic,
        p.recipient_account,
        p.amount,
        p.currency,
        p.reference,
        p.payment_type,
        p.status,
        p.created_at,
        p.settled_at
      FROM payments p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, parseInt(limit), offset]);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM payments p
      ${whereClause}
    `, params);

    const totalPages = Math.ceil(countResult.rows[0].total / parseInt(limit));

    res.json({
      success: true,
      data: {
        payments: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Payment history error', { 
      error: error.message,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history'
    });
  }
});

// Get user balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        balance,
        updated_at
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: parseFloat(result.rows[0].balance),
        lastUpdated: result.rows[0].updated_at
      }
    });

  } catch (error) {
    logger.error('Balance check error', { 
      error: error.message,
      userId: req.user?.id 
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get balance'
    });
  }
});

// Process payment settlement (admin only)
router.post('/settle', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { transactionRef, status } = req.body;

    // Get payment details
    const paymentResult = await query(`
      SELECT id, amount, sender_id
      FROM payments 
      WHERE transaction_ref = $1 AND status = 'pending'
    `, [transactionRef]);

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or already settled'
      });
    }

    const payment = paymentResult.rows[0];

    await query('BEGIN');

    try {
      if (status === 'completed') {
        // Payment successful - no balance change needed
        await query(`
          UPDATE payments 
          SET status = 'completed', settled_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [payment.id]);

        logger.info('Payment completed', {
          paymentId: payment.id,
          transactionRef,
          amount: payment.amount
        });

      } else if (status === 'failed') {
        // Payment failed - refund balance
        await query(`
          UPDATE users 
          SET balance = balance + $1, updated_at = NOW()
          WHERE id = $2
        `, [payment.amount, payment.sender_id]);

        await query(`
          UPDATE payments 
          SET status = 'failed', settled_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [payment.id]);

        logger.info('Payment failed - balance refunded', {
          paymentId: payment.id,
          transactionRef,
          amount: payment.amount,
          refundedTo: payment.sender_id
        });

      } else {
        // Return to pending
        await query(`
          UPDATE payments 
          SET status = 'pending', settled_at = NULL, updated_at = NOW()
          WHERE id = $1
        `, [payment.id]);
      }

      await query('COMMIT');

      res.json({
        success: true,
        message: `Payment ${status} successfully`,
        data: {
          transactionRef,
          status,
          amount: payment.amount,
          settledAt: status !== 'pending' ? new Date().toISOString() : null
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Payment settlement error', { 
      error: error.message,
      transactionRef: req.body.transactionRef 
    });
    res.status(500).json({
      success: false,
      message: 'Settlement failed'
    });
  }
});

// Get payment statistics (admin only)
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    let timeCondition = '';
    if (period === '24h') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'24 hours\'';
    } else if (period === '7d') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (period === '30d') {
      timeCondition = 'AND created_at >= NOW() - INTERVAL \'30 days\'';
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END), 0) as failed_amount,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
      FROM payments
      WHERE 1=1 ${timeCondition}
    `);

    const currencyBreakdown = await query(`
      SELECT 
        currency,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments
      WHERE 1=1 ${timeCondition}
      GROUP BY currency
      ORDER BY total_amount DESC
    `);

    res.json({
      success: true,
      data: {
        period,
        stats: result.rows[0],
        currencyBreakdown: currencyBreakdown.rows
      }
    });

  } catch (error) {
    logger.error('Payment stats error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment statistics'
    });
  }
});

export default router;
