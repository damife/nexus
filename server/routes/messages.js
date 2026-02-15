import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import swiftMessageService from '../services/swiftMessageService.js';
import swiftGPIService from '../services/swiftGPIService.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import { paymentSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Get user's bank BIC
    const userBankResult = await query(`
      SELECT b.bic FROM banks b
      INNER JOIN users u ON u.bank_id = b.id
      WHERE u.id = $1
    `, [userId]);

    const userBankBIC = userBankResult.rows[0]?.bic;

    // Total messages
    const totalResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE sender_bic = $1) as outbound,
        COUNT(*) FILTER (WHERE receiver_bic = $1) as inbound,
        COUNT(*) as total
      FROM messages
      WHERE DATE(created_at) = $2
    `, [userBankBIC, today]);

    // Status breakdown
    const statusResult = await query(`
      SELECT status, COUNT(*) as count
      FROM messages
      WHERE sender_bic = $1 OR receiver_bic = $1
      GROUP BY status
    `, [userBankBIC]);

    // Recent messages (last hour)
    const recentResult = await query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE created_at >= $1
      AND (sender_bic = $2 OR receiver_bic = $2)
    `, [oneHourAgo, userBankBIC]);

    res.json({
      success: true,
      stats: {
        messages: {
          outbound: parseInt(totalResult.rows[0]?.outbound || 0),
          inbound: parseInt(totalResult.rows[0]?.inbound || 0),
          total: parseInt(totalResult.rows[0]?.total || 0),
          lastHour: parseInt(recentResult.rows[0]?.count || 0)
        },
        statusBreakdown: statusResult.rows.map(row => ({
          status: row.status,
          count: parseInt(row.count)
        }))
      }
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send SWIFT message with proper SWIFT practices
router.post('/', authenticate, sanitizeRequestBody, ...paymentSecurity, async (req, res) => {
  try {
    const {
      messageType,
      senderBIC,
      receiverBIC,
      content,
      priority = 'normal',
      amount,
      currency
    } = req.body;

    // Validate priority
    const validPriorities = ['normal', 'urgent', 'system'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Must be normal, urgent, or system'
      });
    }

    // Check if user has permission for system priority
    if (priority === 'system' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'System priority requires admin privileges'
      });
    }

    // Generate UTR (Unique Transaction Reference)
    const utr = `UTR${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert message directly into database for now
    const result = await query(`
      INSERT INTO messages (
        message_type, sender_bic, receiver_bic, content, priority, 
        user_id, amount, currency, utr, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'sent')
      RETURNING id, utr, created_at
    `, [
      messageType,
      senderBIC,
      receiverBIC,
      content,
      priority,
      req.user.id,
      amount,
      currency,
      utr
    ]);

    res.json({
      success: true,
      message: 'SWIFT message sent successfully',
      data: {
        messageId: result.rows[0].id,
        utr: result.rows[0].utr,
        createdAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    logger.error('Error sending SWIFT message', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send SWIFT message'
    });
  }
});

// Track SWIFT message using GPI
router.get('/track/:utr', authenticate, async (req, res) => {
  try {
    const { utr } = req.params;
    
    const result = await swiftMessageService.trackMessage(utr);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error tracking SWIFT message', {
      error: error.message,
      utr: req.params.utr
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track message'
    });
  }
});

// Search GPI directory for banks
router.get('/gpi/directory/search', authenticate, async (req, res) => {
  try {
    const { bic, name, country } = req.query;
    
    const result = await swiftGPIService.searchBankDirectory(bic, name, country);
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error searching GPI directory', {
      error: error.message,
      query: req.query
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to search directory'
    });
  }
});

// Get message history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get messages for this user
    const result = await query(`
      SELECT 
        id,
        message_type,
        sender_bic,
        receiver_bic,
        content,
        priority,
        status,
        amount,
        currency,
        utr,
        created_at,
        updated_at
      FROM messages 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error getting message history', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get message history'
    });
  }
});

export default router;
