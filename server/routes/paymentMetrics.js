import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

router.get('/payment-metrics', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const metrics = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status IN ('sent', 'completed', 'ack')) as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COALESCE(SUM(amount::numeric), 0) as total_amount,
        COALESCE(AVG(amount::numeric), 0) as average_amount
      FROM messages
      WHERE amount IS NOT NULL
    `);

    const byCurrency = await query(`
      SELECT 
        currency,
        COUNT(*) as count,
        COALESCE(SUM(amount::numeric), 0) as total
      FROM messages
      WHERE currency IS NOT NULL
      GROUP BY currency
      ORDER BY count DESC
    `);

    const byType = await query(`
      SELECT 
        message_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status IN ('sent', 'completed', 'ack')) as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM messages
      GROUP BY message_type
      ORDER BY count DESC
    `);

    const hourlyStats = await query(`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status IN ('sent', 'completed', 'ack')) as successful
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour DESC
      LIMIT 24
    `);

    const result = metrics.rows[0] || {};
    const currencyMap = {};
    byCurrency.rows.forEach(row => {
      currencyMap[row.currency] = {
        count: parseInt(row.count),
        total: parseFloat(row.total)
      };
    });

    const typeMap = {};
    byType.rows.forEach(row => {
      typeMap[row.message_type] = {
        count: parseInt(row.count),
        successful: parseInt(row.successful),
        failed: parseInt(row.failed)
      };
    });

    res.json({
      total: parseInt(result.total || 0),
      successful: parseInt(result.successful || 0),
      failed: parseInt(result.failed || 0),
      pending: parseInt(result.pending || 0),
      totalAmount: parseFloat(result.total_amount || 0),
      averageAmount: parseFloat(result.average_amount || 0),
      byCurrency: currencyMap,
      byType: typeMap,
      hourlyStats: hourlyStats.rows.map(row => ({
        hour: row.hour,
        count: parseInt(row.count),
        successful: parseInt(row.successful)
      }))
    });
  } catch (error) {
    logger.error('Payment metrics error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment metrics'
    });
  }
});

router.get('/payment-transactions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) as total FROM messages WHERE amount IS NOT NULL');
    const total = parseInt(countResult.rows[0].total);

    const transactions = await query(`
      SELECT 
        id,
        payment_id,
        amount,
        currency,
        status,
        message_type,
        created_at
      FROM messages
      WHERE amount IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      transactions: transactions.rows,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Payment transactions error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment transactions'
    });
  }
});

export default router;

