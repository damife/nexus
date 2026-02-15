import { query } from '../config/database.js';
import twoFactorService from '../services/twoFactorService.js';
import logger from '../config/logger.js';

/**
 * 2FA Verification Middleware
 * Checks if 2FA is enabled and verifies token
 */
export const verify2FA = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const twoFactorToken = req.headers['x-2fa-token'];
    const twoFactorStatus = await twoFactorService.get2FAStatus(req.user.id);

    // If 2FA is not enabled, skip verification
    if (!twoFactorStatus.enabled) {
      return next();
    }

    // If 2FA is enabled but no token provided
    if (!twoFactorToken) {
      return res.status(401).json({
        success: false,
        message: '2FA token required',
        twoFactorRequired: true,
        method: twoFactorStatus.method
      });
    }

    // Verify token based on method
    let verified = false;
    if (twoFactorStatus.method === 'authenticator') {
      verified = await twoFactorService.verifyToken(req.user.id, twoFactorToken);
    } else if (twoFactorStatus.method === 'email') {
      verified = await twoFactorService.verifyEmailOTP(req.user.id, twoFactorToken);
    }

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    next();
  } catch (error) {
    logger.error('2FA verification error', { error: error.message });
    return res.status(500).json({ success: false, message: '2FA verification failed' });
  }
};

export default { verify2FA };

