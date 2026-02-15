import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import balanceService from '../services/balanceService.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// All balance routes require authentication
router.use(authenticate);

// Get multi-currency balances
router.get('/multi-currency', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT currency, balance, locked_balance, updated_at
      FROM user_balances 
      WHERE user_id = $1 AND balance > 0
      ORDER BY currency
    `, [userId]);

    // Get USD values for all balances
    const balances = [];
    for (const row of result.rows) {
      let usdValue = 0;
      if (row.currency !== 'USD') {
        try {
          // Get exchange rate to USD
          const rate = await getExchangeRate(row.currency, 'USD');
          usdValue = parseFloat(row.balance) * rate;
        } catch (error) {
          logger.error('Error getting exchange rate', { error: error.message });
        }
      } else {
        usdValue = parseFloat(row.balance);
      }

      balances.push({
        currency: row.currency,
        balance: parseFloat(row.balance),
        locked_balance: parseFloat(row.locked_balance || 0),
        usd_value: usdValue,
        updated_at: row.updated_at
      });
    }

    res.json({
      success: true,
      balances: balances
    });

  } catch (error) {
    logger.error('Error getting multi-currency balances', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get balance for specific currency
router.get('/:currency', async (req, res) => {
  try {
    const userId = req.user.id;
    const { currency } = req.params;

    const result = await query(`
      SELECT balance, locked_balance, updated_at
      FROM user_balances 
      WHERE user_id = $1 AND currency = $2
    `, [userId, currency.toUpperCase()]);

    if (result.rows.length === 0) {
      // Create balance record if it doesn't exist
      await query(`
        INSERT INTO user_balances (user_id, currency, balance, locked_balance)
        VALUES ($1, $2, 0, 0)
        ON CONFLICT (user_id, currency) DO NOTHING
      `, [userId, currency.toUpperCase()]);

      return res.json({
        success: true,
        balance: 0,
        locked_balance: 0,
        currency: currency.toUpperCase()
      });
    }

    const balance = result.rows[0];
    let usdValue = 0;
    
    if (currency.toUpperCase() !== 'USD') {
      try {
        const rate = await getExchangeRate(currency.toUpperCase(), 'USD');
        usdValue = parseFloat(balance.balance) * rate;
      } catch (error) {
        logger.error('Error getting exchange rate', { error: error.message });
      }
    } else {
      usdValue = parseFloat(balance.balance);
    }

    res.json({
      success: true,
      balance: parseFloat(balance.balance),
      locked_balance: parseFloat(balance.locked_balance || 0),
      usd_value: usdValue,
      currency: currency.toUpperCase(),
      updated_at: balance.updated_at
    });

  } catch (error) {
    logger.error('Error getting balance', {
      error: error.message,
      userId: req.user.id,
      currency: req.params.currency
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get complete transaction history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, type, search, date_from, date_to } = req.query;

    let queryStr = `
      SELECT 
        id,
        transaction_type,
        currency,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        metadata,
        created_at
      FROM balance_transactions 
      WHERE user_id = $1
    `;
    
    const params = [userId];

    if (type) {
      queryStr += ' AND transaction_type = $' + (params.length + 1);
      params.push(type);
    }

    if (search) {
      queryStr += ' AND (description ILIKE $' + (params.length + 1) + ' OR reference_id ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      queryStr += ' AND created_at >= $' + (params.length + 1);
      params.push(date_from);
    }

    if (date_to) {
      queryStr += ' AND created_at <= $' + (params.length + 1);
      params.push(date_to);
    }

    queryStr += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM balance_transactions WHERE user_id = $1';
    const countParams = [userId];
    
    if (type) {
      countQuery += ' AND transaction_type = $2';
      countParams.push(type);
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      transactions: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error getting transaction history', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get deposit history only
router.get('/deposits', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, search, date_from, date_to } = req.query;

    let queryStr = `
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
      WHERE user_id = $1 AND transaction_type = 'deposit'
    `;
    
    const params = [userId];

    if (search) {
      queryStr += ' AND (payment_id ILIKE $' + (params.length + 1) + ' OR order_id ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      queryStr += ' AND created_at >= $' + (params.length + 1);
      params.push(date_from);
    }

    if (date_to) {
      queryStr += ' AND created_at <= $' + (params.length + 1);
      params.push(date_to);
    }

    queryStr += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, params);

    // Transform data for frontend
    const deposits = result.rows.map(row => ({
      id: row.id,
      payment_id: row.payment_id,
      order_id: row.order_id,
      amount: parseFloat(row.actually_paid || row.amount),
      currency: row.currency,
      cryptocurrency: row.cryptocurrency,
      deposit_address: row.deposit_address,
      status: row.status,
      usd_value: parseFloat(row.amount),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM payments WHERE user_id = $1 AND transaction_type = \'deposit\'';
    const countParams = [userId];
    
    if (search) {
      countQuery += ' AND (payment_id ILIKE $2 OR order_id ILIKE $3)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      countQuery += ' AND created_at >= $' + (countParams.length + 1);
      countParams.push(date_from);
    }

    if (date_to) {
      countQuery += ' AND created_at <= $' + (countParams.length + 1);
      countParams.push(date_to);
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      deposits: deposits,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error getting deposit history', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get deduction history only
router.get('/deductions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, search, date_from, date_to } = req.query;

    let queryStr = `
      SELECT 
        id,
        transaction_type,
        currency,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        created_at
      FROM balance_transactions 
      WHERE user_id = $1 AND amount < 0
    `;
    
    const params = [userId];

    if (search) {
      queryStr += ' AND (description ILIKE $' + (params.length + 1) + ' OR reference_id ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      queryStr += ' AND created_at >= $' + (params.length + 1);
      params.push(date_from);
    }

    if (date_to) {
      queryStr += ' AND created_at <= $' + (params.length + 1);
      params.push(date_to);
    }

    queryStr += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, params);

    // Transform data for frontend
    const deductions = result.rows.map(row => ({
      id: row.id,
      type: row.transaction_type,
      amount: Math.abs(parseFloat(row.amount)), // Make positive for display
      currency: row.currency,
      balance_before: parseFloat(row.balance_before),
      balance_after: parseFloat(row.balance_after),
      description: row.description,
      reference_id: row.reference_id,
      created_at: row.created_at,
      status: 'completed'
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM balance_transactions WHERE user_id = $1 AND amount < 0';
    const countParams = [userId];
    
    if (search) {
      countQuery += ' AND (description ILIKE $2 OR reference_id ILIKE $3)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (date_from) {
      countQuery += ' AND created_at >= $' + (countParams.length + 1);
      countParams.push(date_from);
    }

    if (date_to) {
      countQuery += ' AND created_at <= $' + (countParams.length + 1);
      countParams.push(date_to);
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      deductions: deductions,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error getting deduction history', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get balance statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get transaction counts
    const transactionStats = await query(`
      SELECT 
        transaction_type,
        COUNT(*) as count,
        COALESCE(SUM(ABS(amount)), 0) as total_amount
      FROM balance_transactions 
      WHERE user_id = $1
      GROUP BY transaction_type
    `, [userId]);

    // Get balance summary
    const balanceSummary = await query(`
      SELECT 
        currency,
        balance,
        updated_at
      FROM user_balances 
      WHERE user_id = $1 AND balance > 0
      ORDER BY balance DESC
    `, [userId]);

    // Get recent activity
    const recentActivity = await query(`
      SELECT 
        transaction_type,
        amount,
        currency,
        description,
        created_at
      FROM balance_transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    res.json({
      success: true,
      stats: {
        transaction_stats: transactionStats.rows,
        balance_summary: balanceSummary.rows,
        recent_activity: recentActivity.rows,
        total_transactions: recentActivity.rowCount
      }
    });

  } catch (error) {
    logger.error('Error getting balance stats', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get balance chart data
router.get('/chart', async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '7d' } = req.query;

    let dateCondition = '';
    switch (timeframe) {
      case '1d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '1 day'";
        break;
      case '7d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      default:
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
    }

    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        currency,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as withdrawals,
        SUM(amount) as net_change
      FROM balance_transactions 
      WHERE user_id = $1 AND ${dateCondition}
      GROUP BY DATE(created_at), currency
      ORDER BY date ASC
    `, [userId]);

    // Transform data for chart
    const dailyData = {};
    result.rows.forEach(row => {
      if (!dailyData[row.date]) {
        dailyData[row.date] = { date: row.date, balance: 0 };
      }
      dailyData[row.date].balance += parseFloat(row.net_change) || 0;
    });

    const chartData = Object.values(dailyData);

    res.json({
      success: true,
      daily: chartData
    });

  } catch (error) {
    logger.error('Error getting chart data', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Search transactions
router.get('/search', async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: query, type, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    let searchQuery = `
      SELECT 
        id,
        transaction_type,
        currency,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        created_at
      FROM balance_transactions 
      WHERE user_id = $1 AND (
        description ILIKE $2 OR 
        reference_id ILIKE $2 OR 
        transaction_type ILIKE $2
      )
    `;
    
    const params = [userId, `%${query}%`];

    if (type) {
      searchQuery += ' AND transaction_type = $3';
      params.push(type);
    }

    searchQuery += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(parseInt(limit));

    const result = await query(searchQuery, params);

    res.json({
      success: true,
      transactions: result.rows
    });

  } catch (error) {
    logger.error('Error searching transactions', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Export transaction history
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'csv', type, date_from, date_to } = req.query;

    let queryStr = `
      SELECT 
        id,
        transaction_type,
        currency,
        amount,
        balance_before,
        balance_after,
        description,
        reference_id,
        created_at
      FROM balance_transactions 
      WHERE user_id = $1
    `;
    
    const params = [userId];

    if (type) {
      queryStr += ' AND transaction_type = $2';
      params.push(type);
    }

    if (date_from) {
      queryStr += ' AND created_at >= $' + (params.length + 1);
      params.push(date_from);
    }

    if (date_to) {
      queryStr += ' AND created_at <= $' + (params.length + 1);
      params.push(date_to);
    }

    queryStr += ' ORDER BY created_at DESC';
    const result = await query(queryStr, params);

    if (format === 'csv') {
      // Convert to CSV
      const csv = convertToCSV(result.rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        transactions: result.rows
      });
    }

  } catch (error) {
    logger.error('Error exporting transactions', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get transaction summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '30d' } = req.query;

    let dateCondition = '';
    switch (timeframe) {
      case '7d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      default:
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN amount > 0 THEN 1 END) as deposits,
        COUNT(CASE WHEN amount < 0 THEN 1 END) as withdrawals,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(amount), 0) as net_change
      FROM balance_transactions 
      WHERE user_id = $1 AND ${dateCondition}
    `, [userId]);

    res.json({
      success: true,
      summary: result.rows[0],
      timeframe
    });

  } catch (error) {
    logger.error('Error getting transaction summary', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to get exchange rate
async function getExchangeRate(fromCurrency, toCurrency) {
  try {
    // This would call your NowPayments service to get real-time rates
    // For now, return a mock rate
    const mockRates = {
      'BTC': 45000,
      'ETH': 3000,
      'USDT': 1,
      'USDC': 1,
      'LTC': 150,
      'BCH': 300,
      'TRX': 0.1
    };
    
    return mockRates[fromCurrency] || 1;
  } catch (error) {
    logger.error('Error getting exchange rate', error);
    return 1;
  }
}

// Helper function to convert to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

export default router;
