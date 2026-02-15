import { query } from '../config/database.js';
import logger from '../config/logger.js';
import speakeasy from 'speakeasy';
import emailService from './emailService.js';

class TwoFactorAuthService {
  constructor() {
    this.codeLength = 6;
    this.codeExpiryMinutes = 5;
  }

  // Generate alphanumeric 2FA code
  generateAlphanumericCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < this.codeLength; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Send email 2FA code
  async sendEmailCode(userId, email) {
    try {
      const code = this.generateAlphanumericCode();
      const expiresAt = new Date(Date.now() + this.codeExpiryMinutes * 60 * 1000);
      
      // Store email code
      await this.storeEmailCode(userId, code, expiresAt);
      
      // Send email
      await emailService.send2FACode(email, code);
      
      logger.info('Email 2FA code sent', {
        userId,
        email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        expiresAt
      });
      
      return { expiresAt };
    } catch (error) {
      logger.error('Error sending email 2FA code', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Store email code in database
  async storeEmailCode(userId, code, expiresAt) {
    try {
      // Clear any existing codes for this user
      await query(`
        DELETE FROM email_2fa_codes 
        WHERE user_id = $1 OR (expires_at < CURRENT_TIMESTAMP)
      `, [userId]);

      // Insert new code
      await query(`
        INSERT INTO email_2fa_codes (user_id, code, expires_at)
        VALUES ($1, $2, $3)
      `, [userId, code.toUpperCase(), expiresAt]);
    } catch (error) {
      logger.error('Error storing email 2FA code', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Verify email 2FA code
  async verifyEmailCode(userId, providedCode) {
    try {
      const result = await query(`
        SELECT * FROM email_2fa_codes 
        WHERE user_id = $1 AND used = FALSE
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'not_found' };
      }

      const storedCode = result.rows[0];
      
      // Check if expired
      if (new Date(storedCode.expires_at) < new Date()) {
        await this.clearEmailCode(userId);
        return { valid: false, reason: 'expired' };
      }
      
      // Check if code matches
      if (storedCode.code !== providedCode.toUpperCase()) {
        return { valid: false, reason: 'invalid' };
      }
      
      // Mark code as used
      await this.markEmailCodeAsUsed(storedCode.id);
      
      logger.info('Email 2FA code verified', {
        userId,
        codeId: storedCode.id
      });
      
      return { valid: true };
    } catch (error) {
      logger.error('Error verifying email 2FA code', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Mark email code as used
  async markEmailCodeAsUsed(codeId) {
    try {
      await query(`
        UPDATE email_2fa_codes 
        SET used = TRUE 
        WHERE id = $1
      `, [codeId]);
    } catch (error) {
      logger.error('Error marking email code as used', {
        error: error.message,
        codeId
      });
      throw error;
    }
  }

  // Clear email codes for user
  async clearEmailCode(userId) {
    try {
      await query(`
        DELETE FROM email_2fa_codes 
        WHERE user_id = $1
      `, [userId]);
    } catch (error) {
      logger.error('Error clearing email 2FA codes', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Setup TOTP for user
  async setupTOTP(userId, email) {
    try {
      const secret = speakeasy.generateSecret({
        name: `SwiftNexus (${email})`,
        issuer: 'SwiftNexus Enterprise',
        length: 32
      });

      // Store TOTP secret
      await query(`
        INSERT INTO two_factor_auth (user_id, secret, method, enabled)
        VALUES ($1, $2, 'totp', FALSE)
        ON CONFLICT (user_id) 
        DO UPDATE SET
          secret = EXCLUDED.secret,
          method = EXCLUDED.method,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, secret.base32]);

      return {
        secret: secret.base32,
        qrCode: secret.otpauth_url,
        backupCodes: await this.generateBackupCodes(userId)
      };
    } catch (error) {
      logger.error('Error setting up TOTP', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Verify TOTP token
  async verifyTOTP(userId, token) {
    try {
      const result = await query(`
        SELECT secret, enabled FROM two_factor_auth 
        WHERE user_id = $1 AND method = 'totp'
      `, [userId]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'not_setup' };
      }

      const { secret, enabled } = result.rows[0];
      
      if (!enabled) {
        return { valid: false, reason: 'not_enabled' };
      }

      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (verified) {
        logger.info('TOTP token verified', { userId });
      }

      return { valid: verified };
    } catch (error) {
      logger.error('Error verifying TOTP token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Enable TOTP for user
  async enableTOTP(userId, token) {
    try {
      const verification = await this.verifyTOTP(userId, token);
      
      if (!verification.valid) {
        return { success: false, reason: verification.reason };
      }

      await query(`
        UPDATE two_factor_auth 
        SET enabled = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND method = 'totp'
      `, [userId]);

      logger.info('TOTP enabled for user', { userId });
      
      return { success: true };
    } catch (error) {
      logger.error('Error enabling TOTP', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Generate backup codes
  async generateBackupCodes(userId) {
    try {
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(this.generateAlphanumericCode());
      }

      // Store backup codes
      for (const code of codes) {
        await query(`
          INSERT INTO backup_codes (user_id, code, used)
          VALUES ($1, $2, FALSE)
        `, [userId, code]);
      }

      return codes;
    } catch (error) {
      logger.error('Error generating backup codes', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Verify backup code
  async verifyBackupCode(userId, code) {
    try {
      const result = await query(`
        SELECT * FROM backup_codes 
        WHERE user_id = $1 AND code = $2 AND used = FALSE
        LIMIT 1
      `, [userId, code.toUpperCase()]);

      if (result.rows.length === 0) {
        return { valid: false, reason: 'invalid' };
      }

      // Mark backup code as used
      await query(`
        UPDATE backup_codes 
        SET used = TRUE, used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [result.rows[0].id]);

      logger.info('Backup code used', {
        userId,
        codeId: result.rows[0].id
      });

      return { valid: true };
    } catch (error) {
      logger.error('Error verifying backup code', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Get user's 2FA methods
  async getUser2FAMethods(userId) {
    try {
      const result = await query(`
        SELECT method, enabled, created_at, updated_at
        FROM two_factor_auth 
        WHERE user_id = $1
      `, [userId]);

      const backupCodesResult = await query(`
        SELECT COUNT(*) as total, COUNT(CASE WHEN used = FALSE THEN 1 END) as unused
        FROM backup_codes 
        WHERE user_id = $1
      `, [userId]);

      return {
        methods: result.rows,
        backupCodes: {
          total: parseInt(backupCodesResult.rows[0].total),
          unused: parseInt(backupCodesResult.rows[0].unused)
        }
      };
    } catch (error) {
      logger.error('Error getting user 2FA methods', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Disable 2FA method
  async disable2FAMethod(userId, method) {
    try {
      if (method === 'totp') {
        await query(`
          DELETE FROM two_factor_auth 
          WHERE user_id = $1 AND method = 'totp'
        `, [userId]);

        // Clear backup codes
        await query(`
          DELETE FROM backup_codes 
          WHERE user_id = $1
        `, [userId]);
      }

      logger.info('2FA method disabled', { userId, method });
      
      return { success: true };
    } catch (error) {
      logger.error('Error disabling 2FA method', {
        error: error.message,
        userId,
        method
      });
      throw error;
    }
  }

  // Check if user has any 2FA enabled
  async has2FAEnabled(userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as count FROM two_factor_auth 
        WHERE user_id = $1 AND enabled = TRUE
      `, [userId]);

      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking 2FA status', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

export default new TwoFactorAuthService();
