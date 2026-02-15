import express from 'express';
import { authenticate } from '../middleware/auth.js';
import cryptoDepositService from '../services/cryptoDepositService.js';
import logger from '../config/logger.js';
import { paymentSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// All deposit routes require authentication
router.use(authenticate);

// Get user's balance
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await req.db.query(
      'SELECT balance FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const balance = parseFloat(result.rows[0].balance);

    res.json({
      success: true,
      data: {
        balance: balance.toFixed(8),
        formattedBalance: `$${balance.toFixed(2)}`
      }
    });

  } catch (error) {
    logger.error('Error getting user balance', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get balance history
router.get('/balance-history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await req.db.query(`
      SELECT 
        id,
        type,
        amount,
        balance_before,
        balance_after,
        description,
        created_at
      FROM balance_history 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await req.db.query(
      'SELECT COUNT(*) FROM balance_history WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        history: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting balance history', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get supported cryptocurrencies
router.get('/cryptocurrencies', async (req, res) => {
  try {
    const cryptocurrencies = cryptoDepositService.getSupportedCryptocurrencies();
    
    res.json({
      success: true,
      data: cryptocurrencies
    });

  } catch (error) {
    logger.error('Error getting cryptocurrencies', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create new deposit address
router.post('/create', sanitizeRequestBody, ...paymentSecurity, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cryptocurrency } = req.body;

    if (!cryptocurrency) {
      return res.status(400).json({
        success: false,
        message: 'Cryptocurrency is required'
      });
    }

    // Validate supported cryptocurrency
    const supportedCryptos = cryptoDepositService.getSupportedCryptocurrencies();
    const crypto = supportedCryptos.find(c => c.symbol === cryptocurrency.toUpperCase());
    
    if (!crypto) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported cryptocurrency'
      });
    }

    // Create deposit address
    const deposit = await cryptoDepositService.createDepositAddress(
      userId,
      cryptocurrency
    );

    res.json({
      success: true,
      data: {
        deposit,
        cryptocurrency: crypto
      }
    });

  } catch (error) {
    logger.error('Error creating deposit address', {
      error: error.message,
      userId: req.user.id,
      cryptocurrency: req.body.cryptocurrency
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create deposit address'
    });
  }
});

// Get deposit status
router.get('/status/:depositId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { depositId } = req.params;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: 'Deposit ID is required'
      });
    }

    const deposit = await cryptoDepositService.getDepositStatus(
      parseInt(depositId),
      userId
    );

    res.json({
      success: true,
      data: deposit
    });

  } catch (error) {
    logger.error('Error getting deposit status', {
      error: error.message,
      userId: req.user.id,
      depositId: req.params.depositId
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get deposit status'
    });
  }
});

// Get all user deposits
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, status } = req.query;

    let query = `
      SELECT 
        id,
        payment_id,
        order_id,
        amount,
        currency,
        pay_currency as cryptocurrency,
        pay_address as deposit_address,
        status,
        actually_paid,
        created_at,
        updated_at
      FROM payments 
      WHERE user_id = $1
    `;
    
    const params = [userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await req.db.query(query, params);

    // Transform data to match expected format
    const deposits = result.rows.map(row => ({
      id: row.id,
      payment_id: row.payment_id,
      cryptocurrency: row.cryptocurrency,
      amount: row.actually_paid || row.amount,
      usd_value: row.amount,
      tx_hash: row.payment_id,
      status: row.status,
      deposit_address: row.deposit_address,
      created_at: row.created_at,
      updated_at: row.updated_at,
      confirmed_at: row.status === 'finished' ? row.updated_at : null
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM payments WHERE user_id = $1';
    const countParams = [userId];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await req.db.query(countQuery, countParams);

    res.json({
      success: true,
      data: {
        deposits: deposits,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    logger.error('Error getting user deposits', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// IPN callback endpoint (for NowPayments)
router.post('/callback', async (req, res) => {
  try {
    const callbackData = req.body;
    
    logger.info('Received IPN callback', {
      callbackData
    });

    const result = await cryptoDepositService.processIPNCallback(callbackData);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Error processing IPN callback', {
      error: error.message,
      callbackData: req.body
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to process callback'
    });
  }
});

// Get deposit statistics
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total deposits
    const totalDepositsResult = await req.db.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_usd_value,
        COUNT(CASE WHEN status = 'finished' THEN 1 END) as confirmed_count,
        COALESCE(SUM(CASE WHEN status = 'finished' THEN amount END), 0) as confirmed_usd_value
      FROM payments 
      WHERE user_id = $1
    `, [userId]);

    // Get deposits by cryptocurrency
    const cryptoDepositsResult = await req.db.query(`
      SELECT 
        pay_currency as cryptocurrency,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_usd_value
      FROM payments 
      WHERE user_id = $1 AND status = 'finished'
      GROUP BY pay_currency
      ORDER BY total_usd_value DESC
    `, [userId]);

    // Get recent deposits
    const recentDepositsResult = await req.db.query(`
      SELECT 
        id,
        payment_id,
        pay_currency as cryptocurrency,
        amount as usd_value,
        status,
        created_at
      FROM payments 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      data: {
        total: totalDepositsResult.rows[0],
        byCryptocurrency: cryptoDepositsResult.rows,
        recent: recentDepositsResult.rows
      }
    });

  } catch (error) {
    logger.error('Error getting deposit statistics', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router;
