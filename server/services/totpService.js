import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import logger from '../config/logger.js';

class TOTPService {
  constructor() {
    this.issuer = 'SwiftNexus Enterprise';
  }

  /**
   * Generate TOTP secret for user
   */
  generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: this.issuer,
        length: 32
      });

      logger.info('TOTP secret generated', { userId, userEmail });
      
      return {
        secret: secret.base32,
        qrCode: null, // Will be generated separately
        manualEntryKey: secret.base32
      };
    } catch (error) {
      logger.error('Error generating TOTP secret', {
        userId,
        userEmail,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(secret, userEmail) {
    try {
      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret,
        label: userEmail,
        issuer: this.issuer
      });

      const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
      
      logger.info('QR code generated', { userEmail });
      
      return qrCodeDataUrl;
    } catch (error) {
      logger.error('Error generating QR code', {
        userEmail,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret, token, window = 2) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window // Allow time drift
      });

      logger.info('TOTP token verification attempt', {
        verified,
        tokenLength: token ? token.length : 0
      });

      return verified;
    } catch (error) {
      logger.error('Error verifying TOTP token', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    try {
      const codes = [];
      for (let i = 0; i < count; i++) {
        codes.push(speakeasy.generateSecret({ length: 8 }).base32.substring(0, 8));
      }

      logger.info('Backup codes generated', { count });
      
      return codes;
    } catch (error) {
      logger.error('Error generating backup codes', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(providedCode, storedCodes) {
    try {
      const normalizedProvided = providedCode.toUpperCase().replace(/\s/g, '');
      const normalizedStored = storedCodes.map(code => code.toUpperCase().replace(/\s/g, ''));
      
      const index = normalizedStored.indexOf(normalizedProvided);
      
      if (index !== -1) {
        // Remove the used backup code
        const remainingCodes = storedCodes.filter((_, i) => i !== index);
        
        logger.info('Backup code verified and used', {
          codeLength: providedCode.length
        });
        
        return { valid: true, remainingCodes };
      }

      return { valid: false, remainingCodes: storedCodes };
    } catch (error) {
      logger.error('Error verifying backup code', {
        error: error.message
      });
      return { valid: false, remainingCodes: storedCodes };
    }
  }

  /**
   * Get current TOTP token (for testing)
   */
  getCurrentToken(secret) {
    try {
      return speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });
    } catch (error) {
      logger.error('Error getting current TOTP token', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Check if TOTP is properly configured
   */
  isConfigured(secret) {
    try {
      return secret && secret.length >= 16;
    } catch (error) {
      logger.error('Error checking TOTP configuration', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate TOTP setup response
   */
  async generateSetupResponse(userId, userEmail) {
    try {
      const { secret, manualEntryKey } = this.generateSecret(userId, userEmail);
      const qrCode = await this.generateQRCode(secret, userEmail);
      const backupCodes = this.generateBackupCodes();

      return {
        secret,
        qrCode,
        manualEntryKey,
        backupCodes,
        instructions: {
          step1: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
          step2: 'Or manually enter the key in your authenticator app',
          step3: 'Save the backup codes in a secure location',
          step4: 'Enter the 6-digit code from your app to verify setup'
        }
      };
    } catch (error) {
      logger.error('Error generating TOTP setup response', {
        userId,
        userEmail,
        error: error.message
      });
      throw error;
    }
  }
}

export default new TOTPService();
