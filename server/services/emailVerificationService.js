import { randomBytes } from 'crypto';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import emailService from './emailService.js';

/**
 * Email Verification Service
 * Handles email confirmation for new users
 */
class EmailVerificationService {
  /**
   * Generate email verification token
   * @returns {String} Verification token
   */
  generateToken() {
    return randomBytes(32).toString('hex');
  }

  /**
   * Send verification email
   * @param {Number} userId - User ID
   * @param {String} email - User email
   * @param {String} name - User name
   */
  async sendVerificationEmail(userId, email, name) {
    try {
      const token = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save token to database
      await query(`
        UPDATE users 
        SET email_verification_token = $1, email_verification_expires = $2
        WHERE id = $3
      `, [token, expiresAt, userId]);

      // Send email
      const verificationUrl = `${process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:3000'}/verify-email?token=${token}`;
      
      const subject = 'Verify Your SwiftNexus Account';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Welcome to SwiftNexus Enterprise, ${name}!</h2>
            <p>Please verify your email address to complete your registration.</p>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
        </html>
      `;

      await emailService.sendEmail(email, subject, html);

      logger.info('Verification email sent', { userId, email });
    } catch (error) {
      logger.error('Error sending verification email', { userId, email, error: error.message });
      throw error;
    }
  }

  /**
   * Verify email token
   * @param {String} token - Verification token
   * @returns {Object} Verification result
   */
  async verifyToken(token) {
    try {
      const result = await query(`
        SELECT id, email, email_verification_expires 
        FROM users 
        WHERE email_verification_token = $1 AND email_verified = FALSE
      `, [token]);

      if (result.rows.length === 0) {
        return { success: false, message: 'Invalid or already used verification token' };
      }

      const user = result.rows[0];

      // Check expiration
      if (new Date(user.email_verification_expires) < new Date()) {
        return { success: false, message: 'Verification token has expired' };
      }

      // Mark email as verified
      await query(`
        UPDATE users 
        SET email_verified = TRUE, 
            email_verification_token = NULL, 
            email_verification_expires = NULL
        WHERE id = $1
      `, [user.id]);

      logger.info('Email verified', { userId: user.id, email: user.email });

      return { success: true, message: 'Email verified successfully', userId: user.id };
    } catch (error) {
      logger.error('Error verifying token', { error: error.message });
      return { success: false, message: 'Verification failed' };
    }
  }

  /**
   * Resend verification email
   * @param {Number} userId - User ID
   */
  async resendVerificationEmail(userId) {
    try {
      const result = await query('SELECT email, name FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const { email, name } = result.rows[0];

      await this.sendVerificationEmail(userId, email, name);

      return { success: true, message: 'Verification email sent' };
    } catch (error) {
      logger.error('Error resending verification email', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if email is verified
   * @param {Number} userId - User ID
   * @returns {Boolean} True if verified
   */
  async isEmailVerified(userId) {
    try {
      const result = await query('SELECT email_verified FROM users WHERE id = $1', [userId]);

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].email_verified || false;
    } catch (error) {
      logger.error('Error checking email verification', { userId, error: error.message });
      return false;
    }
  }
}

export default new EmailVerificationService();

