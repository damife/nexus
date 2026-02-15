import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import twoFactorService from '../services/twoFactorService.js';
import logger from '../config/logger.js';

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  // Check if token is blacklisted
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token has been revoked',
      code: 'TOKEN_REVOKED'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED',
          expiredAt: err.expiredAt
        });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ 
          success: false, 
          error: 'Invalid token',
          code: 'TOKEN_INVALID'
        });
      }
      return res.status(403).json({ 
        success: false, 
        error: 'Token verification failed',
        code: 'TOKEN_ERROR'
      });
    }
    
    req.user = decoded;
    req.token = token;
    next();
  });
};

// Token refresh endpoint
export const refreshToken = (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      success: false, 
      error: 'Refresh token required' 
    });
  }

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid refresh token' 
      });
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, username: decoded.username, role: decoded.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ 
      success: true, 
      accessToken: newAccessToken 
    });
  });
};

// Logout endpoint
export const logout = (req, res) => {
  const token = req.token;
  if (token) {
    tokenBlacklist.add(token);
  }
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
};

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been revoked' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Get full user data from database
    const userResult = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Check if user is banned or blocked
    if (user.status === 'banned' || user.status === 'blocked') {
      return res.status(403).json({ 
        success: false, 
        message: `Account is ${user.status}. Please contact administrator.` 
      });
    }

    req.user = { ...decoded, ...user };
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * 2FA Verification Middleware
 * Requires 2FA token for sensitive operations if 2FA is enabled
 */
export const require2FA = async (req, res, next) => {
  try {
    const twoFactorToken = req.headers['x-2fa-token'];
    const twoFactorStatus = await twoFactorService.get2FAStatus(req.user.id);

    if (!twoFactorStatus.enabled) {
      return next(); // 2FA not enabled, skip
    }

    if (!twoFactorToken) {
      return res.status(401).json({
        success: false,
        message: '2FA token required',
        twoFactorRequired: true,
        method: twoFactorStatus.method
      });
    }

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

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Alias for requireRole with admin role
export const requireAdmin = requireRole('admin');

