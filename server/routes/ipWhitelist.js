import express from 'express';
import ipWhitelistService from '../services/ipWhitelistService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's IP whitelist
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const whitelist = await ipWhitelistService.getWhitelist(userId);
    
    res.json({
      success: true,
      whitelist
    });
  } catch (error) {
    console.error('Error getting IP whitelist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get IP whitelist',
      error: error.message
    });
  }
});

// Add IP to whitelist
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ipAddress, description } = req.body;

    if (!ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    const result = await ipWhitelistService.addToWhitelist(userId, ipAddress, description);
    
    res.json({
      success: true,
      message: 'IP address added to whitelist successfully',
      data: result
    });
  } catch (error) {
    console.error('Error adding IP to whitelist:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add IP to whitelist',
      error: error.message
    });
  }
});

// Remove IP from whitelist
router.delete('/:whitelistId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { whitelistId } = req.params;

    await ipWhitelistService.removeFromWhitelist(userId, parseInt(whitelistId));
    
    res.json({
      success: true,
      message: 'IP address removed from whitelist successfully'
    });
  } catch (error) {
    console.error('Error removing IP from whitelist:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove IP from whitelist',
      error: error.message
    });
  }
});

// Check if IP is whitelisted
router.get('/check/:ipAddress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { ipAddress } = req.params;

    const result = await ipWhitelistService.isIPWhitelisted(userId, ipAddress);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error checking IP whitelist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check IP whitelist',
      error: error.message
    });
  }
});

// Get access logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    const logs = await ipWhitelistService.getAccessLogs(userId, parseInt(limit));
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error getting access logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get access logs',
      error: error.message
    });
  }
});

// Get whitelist statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await ipWhitelistService.getWhitelistStats(userId);
    
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    console.error('Error getting whitelist stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get whitelist statistics',
      error: error.message
    });
  }
});

// Clear whitelist cache
router.post('/clear-cache', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    ipWhitelistService.clearCache(userId);
    
    res.json({
      success: true,
      message: 'Whitelist cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing whitelist cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear whitelist cache',
      error: error.message
    });
  }
});

export default router;
