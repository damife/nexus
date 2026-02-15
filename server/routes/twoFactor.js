import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import twoFactorService from '../services/twoFactorService.js';
import { validate2FA } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Get 2FA status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const status = await twoFactorService.get2FAStatus(req.user.id);
    res.json({
      success: true,
      enabled: status.enabled,
      method: status.method
    });
  } catch (error) {
    logger.error('Get 2FA status error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Generate authenticator secret
 */
router.post('/authenticator/setup', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const secret = await twoFactorService.generateSecret(req.user.id, userResult.rows[0].email);

    res.json({
      success: true,
      secret: secret.secret,
      qrCode: secret.qrCode,
      manualEntryKey: secret.manualEntryKey
    });
  } catch (error) {
    logger.error('Generate 2FA secret error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/authenticator/verify', authenticate, validate2FA, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }

    const verified = await twoFactorService.verifyToken(req.user.id, token);

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    await twoFactorService.enable2FA(req.user.id, 'authenticator');

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    logger.error('Verify 2FA token error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Send email OTP
 */
router.post('/email/send', authenticate, async (req, res) => {
  try {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const otp = await twoFactorService.sendEmailOTP(req.user.id, userResult.rows[0].email);

    res.json({
      success: true,
      message: 'OTP sent to email',
      // Only return OTP in development
      ...(process.env.NODE_ENV === 'development' && otp ? { otp } : {})
    });
  } catch (error) {
    logger.error('Send email OTP error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Verify email OTP and enable
 */
router.post('/email/verify', authenticate, async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP required' });
    }

    const verified = await twoFactorService.verifyEmailOTP(req.user.id, otp);

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await twoFactorService.enable2FA(req.user.id, 'email');

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    logger.error('Verify email OTP error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Disable 2FA
 */
router.post('/disable', authenticate, async (req, res) => {
  try {
    await twoFactorService.disable2FA(req.user.id);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    logger.error('Disable 2FA error', { error: error.message });
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

