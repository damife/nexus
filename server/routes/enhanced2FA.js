import express from 'express';
import { authenticate } from '../middleware/auth.js';
import twoFactorAuthService from '../services/twoFactorAuthService.js';
import hardwareTokenService from '../services/hardwareTokenService.js';
import logger from '../config/logger.js';
import { authSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// All 2FA routes require authentication
router.use(authenticate);

// Send email 2FA code
router.post('/email/send', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await twoFactorAuthService.sendEmailCode(userId, email);
    
    res.json({
      success: true,
      data: result,
      message: '2FA code sent to your email'
    });

  } catch (error) {
    logger.error('Error sending email 2FA code', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to send 2FA code'
    });
  }
});

// Verify email 2FA code
router.post('/email/verify', sanitizeRequestBody, ...authSecurity, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }

    const result = await twoFactorAuthService.verifyEmailCode(userId, code);
    
    if (result.valid) {
      res.json({
        success: true,
        message: '2FA code verified successfully'
      });
    } else {
      let message = 'Invalid 2FA code';
      if (result.reason === 'expired') {
        message = '2FA code has expired';
      } else if (result.reason === 'not_found') {
        message = 'No 2FA code found';
      }
      
      res.status(400).json({
        success: false,
        message
      });
    }

  } catch (error) {
    logger.error('Error verifying email 2FA code', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify 2FA code'
    });
  }
});

// Setup TOTP (Authenticator app)
router.post('/totp/setup', async (req, res) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await twoFactorAuthService.setupTOTP(userId, email);
    
    res.json({
      success: true,
      data: result,
      message: 'TOTP setup initiated'
    });

  } catch (error) {
    logger.error('Error setting up TOTP', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to setup TOTP'
    });
  }
});

// Verify TOTP token
router.post('/totp/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await twoFactorAuthService.verifyTOTP(userId, token);
    
    if (result.valid) {
      res.json({
        success: true,
        message: 'TOTP token verified successfully'
      });
    } else {
      let message = 'Invalid TOTP token';
      if (result.reason === 'not_setup') {
        message = 'TOTP not setup for this user';
      } else if (result.reason === 'not_enabled') {
        message = 'TOTP not enabled for this user';
      }
      
      res.status(400).json({
        success: false,
        message
      });
    }

  } catch (error) {
    logger.error('Error verifying TOTP token', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify TOTP token'
    });
  }
});

// Enable TOTP
router.post('/totp/enable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await twoFactorAuthService.enableTOTP(userId, token);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'TOTP enabled successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to enable TOTP'
      });
    }

  } catch (error) {
    logger.error('Error enabling TOTP', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to enable TOTP'
    });
  }
});

// Verify backup code
router.post('/backup/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Backup code is required'
      });
    }

    const result = await twoFactorAuthService.verifyBackupCode(userId, code);
    
    if (result.valid) {
      res.json({
        success: true,
        message: 'Backup code verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid backup code'
      });
    }

  } catch (error) {
    logger.error('Error verifying backup code', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify backup code'
    });
  }
});

// Get user's 2FA methods
router.get('/methods', async (req, res) => {
  try {
    const userId = req.user.id;
    const methods = await twoFactorAuthService.getUser2FAMethods(userId);
    
    res.json({
      success: true,
      data: methods
    });

  } catch (error) {
    logger.error('Error getting user 2FA methods', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get 2FA methods'
    });
  }
});

// Disable 2FA method
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user.id;
    const { method } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        message: 'Method is required'
      });
    }

    const result = await twoFactorAuthService.disable2FAMethod(userId, method);
    
    res.json({
      success: true,
      message: '2FA method disabled successfully'
    });

  } catch (error) {
    logger.error('Error disabling 2FA method', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA method'
    });
  }
});

// Check if user has 2FA enabled
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const has2FA = await twoFactorAuthService.has2FAEnabled(userId);
    
    res.json({
      success: true,
      data: { has2FA }
    });

  } catch (error) {
    logger.error('Error checking 2FA status', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to check 2FA status'
    });
  }
});

// Hardware Token Routes

// Get supported hardware token types
router.get('/hardware/supported', async (req, res) => {
  try {
    const supportedTokens = hardwareTokenService.getSupportedTokenTypes();
    
    res.json({
      success: true,
      data: supportedTokens
    });

  } catch (error) {
    logger.error('Error getting supported hardware tokens', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get supported hardware tokens'
    });
  }
});

// Register hardware token
router.post('/hardware/register', async (req, res) => {
  try {
    const userId = req.user.id;
    const tokenData = req.body;

    const result = await hardwareTokenService.registerHardwareToken(userId, tokenData);
    
    res.json({
      success: true,
      data: result,
      message: 'Hardware token registered successfully'
    });

  } catch (error) {
    logger.error('Error registering hardware token', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to register hardware token'
    });
  }
});

// Get user's hardware tokens
router.get('/hardware/tokens', async (req, res) => {
  try {
    const userId = req.user.id;
    const tokens = await hardwareTokenService.getUserHardwareTokens(userId);
    
    res.json({
      success: true,
      data: tokens
    });

  } catch (error) {
    logger.error('Error getting user hardware tokens', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get hardware tokens'
    });
  }
});

// Generate hardware token challenge
router.post('/hardware/challenge', async (req, res) => {
  try {
    const userId = req.user.id;
    const { tokenType } = req.body;

    if (!tokenType) {
      return res.status(400).json({
        success: false,
        message: 'Token type is required'
      });
    }

    const challenge = await hardwareTokenService.generateChallenge(userId, tokenType);
    
    res.json({
      success: true,
      data: challenge,
      message: 'Challenge generated successfully'
    });

  } catch (error) {
    logger.error('Error generating hardware token challenge', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate challenge'
    });
  }
});

// Verify hardware token
router.post('/hardware/verify', async (req, res) => {
  try {
    const userId = req.user.id;
    const challengeResponse = req.body;

    const result = await hardwareTokenService.verifyHardwareToken(userId, challengeResponse);
    
    if (result.valid) {
      // Update last used timestamp
      await hardwareTokenService.updateLastUsed(result.token.id);
      
      res.json({
        success: true,
        message: 'Hardware token verified successfully'
      });
    } else {
      let message = 'Hardware token verification failed';
      if (result.reason === 'token_not_found') {
        message = 'Hardware token not found';
      }
      
      res.status(400).json({
        success: false,
        message
      });
    }

  } catch (error) {
    logger.error('Error verifying hardware token', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to verify hardware token'
    });
  }
});

// Remove hardware token
router.delete('/hardware/:tokenId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { tokenId } = req.params;

    const result = await hardwareTokenService.removeHardwareToken(userId, tokenId);
    
    res.json({
      success: true,
      data: result,
      message: 'Hardware token removed successfully'
    });

  } catch (error) {
    logger.error('Error removing hardware token', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove hardware token'
    });
  }
});

// Check if user has hardware tokens
router.get('/hardware/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const hasTokens = await hardwareTokenService.hasHardwareTokens(userId);
    
    res.json({
      success: true,
      data: { hasTokens }
    });

  } catch (error) {
    logger.error('Error checking hardware token status', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to check hardware token status'
    });
  }
});

export default router;
