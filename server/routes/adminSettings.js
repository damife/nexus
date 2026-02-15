import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import feeService from '../services/feeService.js';
import logger from '../config/logger.js';
import { validateUserInput } from '../middleware/security.js';

const router = express.Router();

// All routes require admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

/**
 * Get all system settings
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM system_settings ORDER BY category, setting_key'
    );

    // Don't expose sensitive values
    const settings = result.rows.map(row => ({
      key: row.setting_key,
      value: row.setting_key.includes('api_key') || row.setting_key.includes('secret') 
        ? (row.setting_value ? '***configured***' : '')
        : row.setting_value,
      type: row.setting_type,
      category: row.category,
      description: row.description
    }));

    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    logger.error('Get settings error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Get email settings
 */
router.get('/email', async (req, res) => {
  try {
    const result = await query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE category = 'email' OR category = 'payment'
      ORDER BY setting_key
    `);

    const settings = {
      resendApiKey: '',
      resendFromEmail: '',
      smtpHost: '',
      smtpPort: '',
      smtpUser: '',
      smtpPass: '',
      emailProvider: 'resend'
    };

    result.rows.forEach(row => {
      const value = row.setting_key.includes('api_key') || row.setting_key.includes('secret') || row.setting_key.includes('pass')
        ? (row.setting_value || '')
        : row.setting_value;
      
      switch (row.setting_key) {
        case 'resend_api_key':
          settings.resendApiKey = value;
          break;
        case 'resend_from_email':
          settings.resendFromEmail = value;
          break;
        case 'smtp_host':
          settings.smtpHost = value;
          break;
        case 'smtp_port':
          settings.smtpPort = value;
          break;
        case 'smtp_user':
          settings.smtpUser = value;
          break;
        case 'smtp_pass':
          settings.smtpPass = value;
          break;
      }
    });

    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    logger.error('Get email settings error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Save email settings
 */
router.post('/email', validateUserInput({
  resendApiKey: { type: 'text', required: false },
  resendFromEmail: { type: 'email', required: false },
  smtpHost: { type: 'text', required: false },
  smtpPort: { type: 'number', required: false, min: 1, max: 65535 },
  smtpUser: { type: 'text', required: false },
  smtpPass: { type: 'text', required: false },
  emailProvider: { type: 'text', required: true, pattern: '^(resend|smtp)$' }
}), async (req, res) => {
  try {
    const settings = req.body;
    
    // Update each setting in the database
    const updates = [
      ['resend_api_key', settings.resendApiKey],
      ['resend_from_email', settings.resendFromEmail],
      ['smtp_host', settings.smtpHost],
      ['smtp_port', settings.smtpPort],
      ['smtp_user', settings.smtpUser],
      ['smtp_pass', settings.smtpPass]
    ];

    for (const [key, value] of updates) {
      await query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description)
        VALUES ($1, $2, 'string', 'email', $3)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, value, `Email setting: ${key}`]);
    }

    logger.info('Email settings updated', { updatedBy: req.user.id });

    res.json({
      success: true,
      message: 'Email settings saved successfully'
    });
  } catch (error) {
    logger.error('Save email settings error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Test email configuration
 */
router.post('/email/test', validateUserInput({
  to: { type: 'email', required: true },
  provider: { type: 'text', required: true, pattern: '^(resend|smtp)$' }
}), async (req, res) => {
  try {
    const { to, provider } = req.body;
    
    // Get email settings
    const settingsResult = await query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE category = 'email'
    `);

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Test email sending
    const emailService = require('../services/emailService.js').default;
    
    let testResult;
    if (provider === 'resend') {
      testResult = await emailService.sendTestEmail({
        to: to,
        subject: 'SwiftNexus Email Test',
        html: '<p>This is a test email from SwiftNexus to verify your email configuration.</p>',
        apiKey: settings.resend_api_key,
        fromEmail: settings.resend_from_email
      });
    } else {
      testResult = await emailService.sendTestEmailSMTP({
        to: to,
        subject: 'SwiftNexus Email Test',
        html: '<p>This is a test email from SwiftNexus to verify your SMTP configuration.</p>',
        smtpHost: settings.smtp_host,
        smtpPort: settings.smtp_port,
        smtpUser: settings.smtp_user,
        smtpPass: settings.smtp_pass
      });
    }

    logger.info('Email test sent', { to, provider, success: testResult.success });

    res.json({
      success: testResult.success,
      message: testResult.message
    });
  } catch (error) {
    logger.error('Test email error', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send test email' 
    });
  }
});

/**
 * Get crypto settings
 */
router.get('/crypto', async (req, res) => {
  try {
    const result = await query(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE category = 'payment' OR category = 'crypto'
      ORDER BY setting_key
    `);

    const settings = {
      nowpaymentsApiKey: '',
      nowpaymentsIpnSecret: '',
      nowpaymentsBaseUrl: 'https://api.nowpayments.io/v1',
      bitcoinFee: 0.001,
      ethereumFee: 0.01,
      usdtFee: 1.0,
      minimumDeposit: 10.0,
      maximumDeposit: 10000.0,
      autoConfirmDeposits: true,
      confirmationsRequired: 3,
      exchangeRateProvider: 'nowpayments',
      customExchangeRateApi: '',
      exchangeRateMarkup: 2.5,
      depositNotifications: true,
      withdrawalNotifications: true,
      adminEmailNotifications: true
    };

    result.rows.forEach(row => {
      const value = row.setting_key.includes('api_key') || row.setting_key.includes('secret') || row.setting_key.includes('pass')
        ? (row.setting_value || '')
        : row.setting_value;
      
      switch (row.setting_key) {
        case 'nowpayments_api_key':
          settings.nowpaymentsApiKey = value;
          break;
        case 'nowpayments_ipn_secret':
          settings.nowpaymentsIpnSecret = value;
          break;
        case 'nowpayments_base_url':
          settings.nowpaymentsBaseUrl = value;
          break;
        case 'bitcoin_fee':
          settings.bitcoinFee = parseFloat(value) || 0.001;
          break;
        case 'ethereum_fee':
          settings.ethereumFee = parseFloat(value) || 0.01;
          break;
        case 'usdt_fee':
          settings.usdtFee = parseFloat(value) || 1.0;
          break;
        case 'minimum_balance':
          settings.minimumDeposit = parseFloat(value) || 10.0;
          break;
        case 'maximum_deposit':
          settings.maximumDeposit = parseFloat(value) || 10000.0;
          break;
        case 'auto_confirm_deposits':
          settings.autoConfirmDeposits = value === 'true';
          break;
        case 'confirmations_required':
          settings.confirmationsRequired = parseInt(value) || 3;
          break;
        case 'exchange_rate_provider':
          settings.exchangeRateProvider = value || 'nowpayments';
          break;
        case 'custom_exchange_rate_api':
          settings.customExchangeRateApi = value || '';
          break;
        case 'exchange_rate_markup':
          settings.exchangeRateMarkup = parseFloat(value) || 2.5;
          break;
        case 'deposit_notifications':
          settings.depositNotifications = value === 'true';
          break;
        case 'withdrawal_notifications':
          settings.withdrawalNotifications = value === 'true';
          break;
        case 'admin_email_notifications':
          settings.adminEmailNotifications = value === 'true';
          break;
      }
    });

    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    logger.error('Get crypto settings error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Save crypto settings
 */
router.post('/crypto', validateUserInput({
  nowpaymentsApiKey: { type: 'text', required: false },
  nowpaymentsIpnSecret: { type: 'text', required: false },
  nowpaymentsBaseUrl: { type: 'text', required: false },
  bitcoinFee: { type: 'number', required: false, min: 0, max: 1, decimals: 6 },
  ethereumFee: { type: 'number', required: false, min: 0, max: 1, decimals: 6 },
  usdtFee: { type: 'number', required: false, min: 0, max: 100, decimals: 2 },
  minimumDeposit: { type: 'number', required: false, min: 0, max: 1000000, decimals: 2 },
  maximumDeposit: { type: 'number', required: false, min: 0, max: 10000000, decimals: 2 },
  autoConfirmDeposits: { type: 'text', required: false },
  confirmationsRequired: { type: 'number', required: false, min: 1, max: 10 },
  exchangeRateProvider: { type: 'text', required: false },
  customExchangeRateApi: { type: 'text', required: false },
  exchangeRateMarkup: { type: 'number', required: false, min: 0, max: 50, decimals: 2 },
  depositNotifications: { type: 'text', required: false },
  withdrawalNotifications: { type: 'text', required: false },
  adminEmailNotifications: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const settings = req.body;
    
    // Update each setting in the database
    const updates = [
      ['nowpayments_api_key', settings.nowpaymentsApiKey],
      ['nowpayments_ipn_secret', settings.nowpaymentsIpnSecret],
      ['nowpayments_base_url', settings.nowpaymentsBaseUrl],
      ['bitcoin_fee', settings.bitcoinFee],
      ['ethereum_fee', settings.ethereumFee],
      ['usdt_fee', settings.usdtFee],
      ['minimum_balance', settings.minimumDeposit],
      ['maximum_deposit', settings.maximumDeposit],
      ['auto_confirm_deposits', settings.autoConfirmDeposits],
      ['confirmations_required', settings.confirmationsRequired],
      ['exchange_rate_provider', settings.exchangeRateProvider],
      ['custom_exchange_rate_api', settings.customExchangeRateApi],
      ['exchange_rate_markup', settings.exchangeRateMarkup],
      ['deposit_notifications', settings.depositNotifications],
      ['withdrawal_notifications', settings.withdrawalNotifications],
      ['admin_email_notifications', settings.adminEmailNotifications]
    ];

    for (const [key, value] of updates) {
      await query(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description)
        VALUES ($1, $2, 'string', 'payment', $3)
        ON CONFLICT (setting_key) 
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [key, value, `Crypto setting: ${key}`]);
    }

    logger.info('Crypto settings updated', { updatedBy: req.user.id });

    res.json({
      success: true,
      message: 'Crypto settings saved successfully'
    });
  } catch (error) {
    logger.error('Save crypto settings error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Test NowPayments connection
 */
router.post('/crypto/test-nowpayments', validateUserInput({
  apiKey: { type: 'text', required: true },
  baseUrl: { type: 'text', required: true }
}), async (req, res) => {
  try {
    const { apiKey, baseUrl } = req.body;
    
    // Test NowPayments API connection
    const response = await fetch(`${baseUrl}/status`, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      logger.info('NowPayments connection test successful', { status: data });
      
      res.json({
        success: true,
        message: 'NowPayments connection successful',
        data: data
      });
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('NowPayments connection test failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to connect to NowPayments' 
    });
  }
});

/**
 * Get exchange rates
 */
router.get('/exchange-rates', async (req, res) => {
  try {
    // This would integrate with NowPayments or other exchange rate providers
    const rates = {
      btc: 45000.00, // Mock rate
      eth: 3000.00,  // Mock rate
      usdt: 1.00     // USDT is pegged to USD
    };

    res.json({
      success: true,
      rates: rates
    });
  } catch (error) {
    logger.error('Get exchange rates error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Get all message fees
 */
router.get('/fees', async (req, res) => {
  try {
    const fees = await feeService.getAllFees();
    res.json({
      success: true,
      fees: fees
    });
  } catch (error) {
    logger.error('Get fees error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Set message fee
 */
router.post('/fees', validateUserInput({
  messageType: { type: 'text', required: true },
  amount: { type: 'number', required: true, min: 0, max: 1000, decimals: 6 },
  currency: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { messageType, amount, currency = 'USD' } = req.body;

    const fee = await feeService.setFee(messageType, amount, currency);

    res.json({
      success: true,
      fee: fee
    });
  } catch (error) {
    logger.error('Set fee error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Toggle fee active status
 */
router.patch('/fees/:messageType/toggle', validateUserInput({
  isActive: { type: 'text', required: true }
}), async (req, res) => {
  try {
    const { messageType } = req.params;
    const { isActive } = req.body;

    await feeService.toggleFee(messageType, isActive === 'true');

    res.json({
      success: true,
      message: 'Fee status updated'
    });
  } catch (error) {
    logger.error('Toggle fee error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

