import express from 'express';
import bcrypt from 'bcryptjs';
import totpService from '../services/totpService.js';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { authSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// Get 2FA status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        id,
        email,
        name,
        totp_secret,
        totp_enabled,
        backup_codes
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      totpEnabled: user.totp_enabled
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA status',
      error: error.message
    });
  }
});

// Setup 2FA
router.post('/setup', authenticateToken, sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userResult = await query(`
      SELECT email, totp_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userResult.rows[0].totp_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is already enabled'
      });
    }

    const setupData = await totpService.generateSetupResponse(userId, userResult.rows[0].email);
    
    res.json({
      success: true,
      ...setupData
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA',
      error: error.message
    });
  }
});

// Verify and enable 2FA
router.post('/verify', authenticateToken, sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code, secret } = req.body;

    if (!code || !secret) {
      return res.status(400).json({
        success: false,
        message: 'Verification code and secret are required'
      });
    }

    // Verify the TOTP token
    const isValid = totpService.verifyToken(secret, code);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA for the user
    await query(`
      UPDATE users 
      SET totp_secret = $1, totp_enabled = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [secret, userId]);

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA',
      error: error.message
    });
  }
});

// Disable 2FA
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to disable 2FA'
      });
    }

    // Verify current password
    const userResult = await query(`
      SELECT password_hash, totp_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    if (!userResult.rows[0].totp_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Disable 2FA
    await query(`
      UPDATE users 
      SET totp_secret = NULL, totp_enabled = false, backup_codes = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [userId]);

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
      error: error.message
    });
  }
});

// Verify 2FA token (for login)
router.post('/verify-token', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        message: 'User ID and token are required'
      });
    }

    // Get user's TOTP secret
    const userResult = await query(`
      SELECT totp_secret, totp_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!userResult.rows[0].totp_enabled || !userResult.rows[0].totp_secret) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this user'
      });
    }

    // Verify the token
    const isValid = totpService.verifyToken(userResult.rows[0].totp_secret, token);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    res.json({
      success: true,
      message: 'Token verified successfully'
    });
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify token',
      error: error.message
    });
  }
});

// Generate new backup codes
router.post('/backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userResult = await query(`
      SELECT totp_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!userResult.rows[0].totp_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled'
      });
    }

    // Generate new backup codes
    const backupCodes = totpService.generateBackupCodes();
    
    // Store backup codes
    await query(`
      UPDATE users 
      SET backup_codes = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(backupCodes), userId]);

    res.json({
      success: true,
      backupCodes,
      message: 'New backup codes generated successfully'
    });
  } catch (error) {
    console.error('Error generating backup codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate backup codes',
      error: error.message
    });
  }
});

// Verify backup code
router.post('/verify-backup-code', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: 'User ID and backup code are required'
      });
    }

    // Get user's backup codes
    const userResult = await query(`
      SELECT backup_codes, totp_enabled
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!userResult.rows[0].totp_enabled) {
      return res.status(400).json({
        success: false,
        message: '2FA is not enabled for this user'
      });
    }

    const storedCodes = JSON.parse(userResult.rows[0].backup_codes || '[]');
    
    if (storedCodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No backup codes available'
      });
    }

    // Verify backup code
    const { valid, remainingCodes } = totpService.verifyBackupCode(code, storedCodes);
    
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup code'
      });
    }

    // Update remaining backup codes
    await query(`
      UPDATE users 
      SET backup_codes = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(remainingCodes), userId]);

    res.json({
      success: true,
      message: 'Backup code verified successfully',
      remainingCodes: remainingCodes.length
    });
  } catch (error) {
    console.error('Error verifying backup code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify backup code',
      error: error.message
    });
  }
});

export default router;
