import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import NowPaymentsService from '../services/nowpaymentsService.js';
import balanceService from '../services/balanceService.js';
import { validatePayment } from '../middleware/validation.js';
import logger from '../config/logger.js';
import { paymentSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

/**
 * Get user balance
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const balance = await balanceService.getBalance(req.user.id);
    const history = await balanceService.getTransactionHistory(req.user.id, 20);

    res.json({
      success: true,
      balance: balance.balance,
      currency: balance.currency,
      history: history
    });
  } catch (error) {
    logger.error('Get balance error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Create payment deposit
 */
router.post('/deposit', authenticate, sanitizeRequestBody, validatePayment, ...paymentSecurity, async (req, res) => {
  try {
    const { amount, currency = 'USDT', payCurrency } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Get NowPayments configuration from database (setting_key/setting_value)
    const configResult = await query(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ($1, $2, $3, $4, $5, $6)',
      ['nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_payout_wallet', 'nowpayments_payout_currency', 'default_currency', 'default_price']
    );

    const config = {};
    configResult.rows.forEach(row => {
      let val = row.setting_value;
      if (typeof val === 'string' && (val.startsWith('"') || val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (_) {}
      }
      if (typeof val === 'object' && val !== null && 'value' in val) val = val.value;
      const key = row.setting_key.replace('nowpayments_', '').replace('default_', '');
      config[key] = typeof val === 'string' ? val : (val || '');
    });

    if (!config.api_key) {
      return res.status(400).json({ success: false, message: 'NowPayments not configured' });
    }

    const nowPaymentsService = new NowPaymentsService(config.api_key, config.ipn_secret);
    
    // Generate unique order ID
    const orderId = `DEP_${req.user.id}_${Date.now()}`;
    const orderDescription = `Deposit for user ${req.user.id}`;
    const ipnCallbackUrl = `${req.protocol}://${req.get('host')}/api/payments/ipn`;

    // Process payment using complete e-commerce flow
    const paymentResult = await nowPaymentsService.processPayment(
      amount,
      config.currency || 'USD',
      payCurrency || 'USDT',
      orderId,
      orderDescription,
      ipnCallbackUrl
    );

    // Store payment record in database
    await query(
      `INSERT INTO payments (user_id, payment_id, order_id, amount, currency, pay_currency, status, pay_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        req.user.id,
        paymentResult.payment.payment_id,
        orderId,
        amount,
        config.currency || 'USD',
        payCurrency || 'USDT',
        'waiting',
        paymentResult.payment.pay_address
      ]
    );

    res.json({
      success: true,
      payment: paymentResult.payment,
      estimate: paymentResult.estimate,
      minimum_amount: paymentResult.minimum_amount
    });
  } catch (error) {
    logger.error('Create payment error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Check payment status
 */
router.get('/status/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Get NowPayments configuration (setting_key/setting_value)
    const configResult = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['nowpayments_api_key']
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].setting_value) {
      return res.status(400).json({ success: false, message: 'NowPayments not configured' });
    }

    let apiKey = configResult.rows[0].setting_value;
    if (typeof apiKey === 'string' && (apiKey.startsWith('"') || apiKey.startsWith('{'))) {
      try { apiKey = JSON.parse(apiKey); } catch (_) {}
    }
    if (typeof apiKey === 'object' && apiKey !== null && 'value' in apiKey) apiKey = apiKey.value;
    const nowPaymentsService = new NowPaymentsService(apiKey);
    
    const status = await nowPaymentsService.getPaymentStatus(paymentId);

    // Update payment status in database
    await query(
      'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $2',
      [status.payment_status, paymentId]
    );

    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    logger.error('Check payment status error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * NowPayments IPN Webhook Handler
 */
router.post('/ipn', async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    
    if (!signature) {
      logger.error('IPN callback missing signature');
      return res.status(400).send('Missing signature');
    }

    // Get IPN secret from database (setting_key/setting_value)
    const configResult = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['nowpayments_ipn_secret']
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].setting_value) {
      logger.error('IPN secret not configured');
      return res.status(400).send('IPN secret not configured');
    }

    let ipnSecret = configResult.rows[0].setting_value;
    if (typeof ipnSecret === 'string' && (ipnSecret.startsWith('"') || ipnSecret.startsWith('{'))) {
      try { ipnSecret = JSON.parse(ipnSecret); } catch (_) {}
    }
    if (typeof ipnSecret === 'object' && ipnSecret !== null && 'value' in ipnSecret) ipnSecret = ipnSecret.value;
    const nowPaymentsService = new NowPaymentsService(null, ipnSecret);

    // Validate IPN signature
    const isValid = nowPaymentsService.validateIpnSignature(req.body, signature);
    
    if (!isValid) {
      logger.error('Invalid IPN signature', { body: req.body, signature });
      return res.status(400).send('Invalid signature');
    }

    const paymentData = req.body;
    logger.info('Received IPN callback', { payment_id: paymentData.payment_id, status: paymentData.payment_status });

    // Update payment in database
    await query(
      `UPDATE payments 
       SET status = $1, actually_paid = $2, outcome_amount = $3, updated_at = CURRENT_TIMESTAMP
       WHERE payment_id = $4`,
      [
        paymentData.payment_status,
        paymentData.actually_paid,
        paymentData.outcome_amount,
        paymentData.payment_id
      ]
    );

    // If payment is finished, credit user balance
    if (paymentData.payment_status === 'finished') {
      // Get payment details from database
      const paymentResult = await query(
        'SELECT user_id, amount, currency FROM payments WHERE payment_id = $1',
        [paymentData.payment_id]
      );

      if (paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];
        
        // Credit user balance (implement balanceService.creditBalance)
        await balanceService.creditBalance(payment.user_id, payment.actually_paid || payment.amount, payment.currency);
        
        logger.info('Payment completed and balance credited', {
          user_id: payment.user_id,
          amount: payment.actually_paid || payment.amount,
          currency: payment.currency,
          payment_id: paymentData.payment_id
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('IPN callback error', { error: error.message, body: req.body });
    res.status(500).send('Error');
  }
});

/**
 * Get available crypto currencies
 */
router.get('/currencies', authenticate, async (req, res) => {
  try {
    // Get NowPayments configuration (setting_key/setting_value)
    const configResult = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['nowpayments_api_key']
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].setting_value) {
      return res.status(400).json({ success: false, message: 'NowPayments not configured' });
    }

    let apiKey = configResult.rows[0].setting_value;
    if (typeof apiKey === 'string' && (apiKey.startsWith('"') || apiKey.startsWith('{'))) {
      try { apiKey = JSON.parse(apiKey); } catch (_) {}
    }
    if (typeof apiKey === 'object' && apiKey !== null && 'value' in apiKey) apiKey = apiKey.value;
    const nowPaymentsService = new NowPaymentsService(apiKey);
    
    const currencies = await nowPaymentsService.getAvailableCurrencies();
    
    res.json({
      success: true,
      currencies: currencies
    });
  } catch (error) {
    logger.error('Get currencies error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Get payment history for user
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    const paymentsResult = await query(
      `SELECT payment_id, order_id, amount, currency, pay_currency, status, pay_address, created_at, updated_at
       FROM payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM payments WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      payments: paymentsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get payment history error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Get NowPayments statistics (admin only)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Get NowPayments configuration (setting_key/setting_value)
    const configResult = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      ['nowpayments_api_key']
    );

    if (configResult.rows.length === 0 || !configResult.rows[0].setting_value) {
      return res.status(400).json({ success: false, message: 'NowPayments not configured' });
    }

    let apiKey = configResult.rows[0].setting_value;
    if (typeof apiKey === 'string' && (apiKey.startsWith('"') || apiKey.startsWith('{'))) {
      try { apiKey = JSON.parse(apiKey); } catch (_) {}
    }
    if (typeof apiKey === 'object' && apiKey !== null && 'value' in apiKey) apiKey = apiKey.value;
    const nowPaymentsService = new NowPaymentsService(apiKey);
    
    const stats = await nowPaymentsService.getPaymentStats();
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    logger.error('Get payment stats error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

