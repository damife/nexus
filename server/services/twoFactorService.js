import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import emailService from './emailService.js';

/**
 * Two-Factor Authentication Service
 * Supports both email and authenticator app (TOTP)
 */
class TwoFactorService {
  /**
   * Generate TOTP secret for authenticator app
   * @param {Number} userId - User ID
   * @param {String} email - User email
   * @returns {Object} Secret and QR code
   */
  async generateSecret(userId, email) {
    try {
      const secret = speakeasy.generateSecret({
        name: `SwiftNexus (${email})`,
        issuer: 'SwiftNexus Enterprise',
        length: 32
      });

      // Save secret to database (temporary, until verified)
      await query(
        'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
        [secret.base32, userId]
      );

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      logger.info('2FA secret generated', { userId });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Error generating 2FA secret', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Verify TOTP token
   * @param {Number} userId - User ID
   * @param {String} token - TOTP token
   * @returns {Boolean} True if valid
   */
  async verifyToken(userId, token) {
    try {
      const result = await query(
        'SELECT two_factor_secret FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].two_factor_secret) {
        return false;
      }

      const secret = result.rows[0].two_factor_secret;

      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) tolerance
      });

      return verified;
    } catch (error) {
      logger.error('Error verifying 2FA token', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Generate and send email OTP
   * @param {Number} userId - User ID
   * @param {String} email - User email
   * @returns {String} OTP code (for testing, in production should not return)
   */
  async sendEmailOTP(userId, email) {
    try {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in database (with expiration - 10 minutes)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await query(
        'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
        [JSON.stringify({ otp, expiresAt: expiresAt.toISOString() }), userId]
      );

      // Send email
      await emailService.send2FAEmail(email, otp);

      logger.info('2FA email OTP sent', { userId, email });

      // In production, don't return OTP (only for testing)
      if (process.env.NODE_ENV === 'development') {
        return otp;
      }
      return null;
    } catch (error) {
      logger.error('Error sending 2FA email', { userId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Verify email OTP
   * @param {Number} userId - User ID
   * @param {String} otp - OTP code
   * @returns {Boolean} True if valid
   */
  async verifyEmailOTP(userId, otp) {
    try {
      const result = await query(
        'SELECT two_factor_secret FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].two_factor_secret) {
        return false;
      }

      const secretData = JSON.parse(result.rows[0].two_factor_secret || '{}');
      
      if (!secretData.otp || !secretData.expiresAt) {
        return false;
      }

      // Check expiration
      if (new Date(secretData.expiresAt) < new Date()) {
        return false;
      }

      // Verify OTP
      const verified = secretData.otp === otp;

      if (verified) {
        // Clear OTP after use
        await query(
          'UPDATE users SET two_factor_secret = NULL WHERE id = $1',
          [userId]
        );
      }

      return verified;
    } catch (error) {
      logger.error('Error verifying email OTP', { userId, error: error.message });
      return false;
    }
  }

  /**
   * Enable 2FA for user
   * @param {Number} userId - User ID
   * @param {String} method - 'email' or 'authenticator'
   */
  async enable2FA(userId, method) {
    try {
      await query(
        'UPDATE users SET two_factor_enabled = TRUE, two_factor_method = $1 WHERE id = $2',
        [method, userId]
      );

      logger.info('2FA enabled', { userId, method });
    } catch (error) {
      logger.error('Error enabling 2FA', { userId, method, error: error.message });
      throw error;
    }
  }

  /**
   * Disable 2FA for user
   * @param {Number} userId - User ID
   */
  async disable2FA(userId) {
    try {
      await query(
        'UPDATE users SET two_factor_enabled = FALSE, two_factor_method = NULL, two_factor_secret = NULL WHERE id = $1',
        [userId]
      );

      logger.info('2FA disabled', { userId });
    } catch (error) {
      logger.error('Error disabling 2FA', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if 2FA is enabled for user
   * @param {Number} userId - User ID
   * @returns {Object} 2FA status
   */
  async get2FAStatus(userId) {
    try {
      const result = await query(
        'SELECT two_factor_enabled, two_factor_method FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return { enabled: false, method: null };
      }

      return {
        enabled: result.rows[0].two_factor_enabled || false,
        method: result.rows[0].two_factor_method
      };
    } catch (error) {
      logger.error('Error getting 2FA status', { userId, error: error.message });
      return { enabled: false, method: null };
    }
  }
}

export default new TwoFactorService();

