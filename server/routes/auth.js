import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import emailVerificationService from '../services/emailVerificationService.js';
import twoFactorService from '../services/twoFactorService.js';
import logger from '../config/logger.js';
import { authSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// Check if user exists endpoint
router.post('/check-user', async (req, res) => {
  try {
    const { username, email } = req.body;
    const usernameOrEmail = username || email;

    if (!usernameOrEmail) {
      return res.status(400).json({
        success: false,
        error: 'Username or email is required'
      });
    }

    // Check if user exists by email or username
    const result = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $1',
      [usernameOrEmail]
    );

    return res.status(200).json({
      success: true,
      exists: result.rows.length > 0
    });

  } catch (error) {
    logger.error('Error checking user existence', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

router.post('/login', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const usernameOrEmail = username || email;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/email and password are required'
      });
    }

    // Check if user exists by email or username
    const result = await query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [usernameOrEmail]
    );

    if (result.rows.length === 0) {
      logger.warn(`Login attempt failed: User not found (${usernameOrEmail})`);
      return res.status(401).json({
        success: false,
        error: 'Wrong username or password'
      });
    }

    const user = result.rows[0];

    // Check if user is banned or blocked
    if (user.status === 'banned' || user.status === 'blocked') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact administrator.`
      });
    }

    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified',
        emailVerified: false,
        action: 'Please verify your email address before logging in'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logger.warn(`Login attempt failed: Invalid password for user (${usernameOrEmail})`);
      return res.status(401).json({
        success: false,
        error: 'Wrong username or password'
      });
    }

    // Check if 2FA is required and enabled
    const twoFactorStatus = await twoFactorService.get2FAStatus(user.id);
    const twoFactorToken = req.body.twoFactorToken;

    if (twoFactorStatus.enabled) {
      if (!twoFactorToken) {
        return res.status(401).json({
          success: false,
          message: '2FA token required',
          twoFactorRequired: true,
          method: twoFactorStatus.method
        });
      }

      // Verify 2FA token
      let verified = false;
      if (twoFactorStatus.method === 'authenticator') {
        verified = await twoFactorService.verifyToken(user.id, twoFactorToken);
      } else if (twoFactorStatus.method === 'email') {
        verified = await twoFactorService.verifyEmailOTP(user.id, twoFactorToken);
      }

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }
    } else if (user.two_factor_required !== false) {
      // 2FA is required but not set up
      return res.status(403).json({
        success: false,
        message: '2FA setup required',
        twoFactorSetupRequired: true,
        action: 'Please set up two-factor authentication to continue'
      });
    }

    // Get bank info if assigned
    let bankInfo = null;
    if (user.bank_id) {
      const bankResult = await query('SELECT * FROM banks WHERE id = $1', [user.bank_id]);
      bankInfo = bankResult.rows[0] || null;
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        bank: bankInfo,
        emailVerified: user.email_verified,
        twoFactorEnabled: twoFactorStatus.enabled
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Register new user (admin only or public registration if enabled)
 */
router.post('/register', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(`
      INSERT INTO users (name, email, password, role, status, email_verified, two_factor_required)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, status
    `, [name, email, hashedPassword, 'user', 'active', false, true]);

    const newUser = result.rows[0];

    // Send verification email
    await emailVerificationService.sendVerificationEmail(newUser.id, email, name);

    res.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      logger.error('Registration error', { error: error.message });
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

/**
 * Verify email
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required' });
    }

    const result = await emailVerificationService.verifyToken(token);

    if (result.success) {
      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    logger.error('Email verification error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * Resend verification email
 */
router.post('/resend-verification', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email required' });
    }

    const result = await query('SELECT id, name, email_verified FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    await emailVerificationService.resendVerificationEmail(user.id);

    res.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    logger.error('Resend verification error', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
