import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import pricingService from '../services/pricingService.js';
import logger from '../config/logger.js';
import { apiSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// All pricing routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));
router.use(sanitizeRequestBody);
router.use(...apiSecurity);

// Get all pricing configurations
router.get('/', async (req, res) => {
  try {
    const pricing = await pricingService.getAllPricing();
    
    res.json({
      success: true,
      data: pricing
    });

  } catch (error) {
    logger.error('Error getting all pricing', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing configurations'
    });
  }
});

// Get pricing for specific message type
router.get('/:messageType', async (req, res) => {
  try {
    const { messageType } = req.params;
    const { currency = 'USD', volume = 0 } = req.query;

    const pricing = await pricingService.getCurrentPricing(messageType, currency, parseInt(volume));
    
    res.json({
      success: true,
      data: pricing
    });

  } catch (error) {
    logger.error('Error getting pricing', {
      error: error.message,
      messageType: req.params.messageType,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pricing'
    });
  }
});

// Update pricing for message type
router.put('/:messageType', async (req, res) => {
  try {
    const { messageType } = req.params;
    const userId = req.user.id;

    const pricing = await pricingService.updatePricing(messageType, req.body, userId);
    
    res.json({
      success: true,
      data: pricing,
      message: 'Pricing updated successfully'
    });

  } catch (error) {
    logger.error('Error updating pricing', {
      error: error.message,
      messageType: req.params.messageType,
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update pricing'
    });
  }
});

// Create new pricing configuration
router.post('/', async (req, res) => {
  try {
    const { messageType } = req.body;
    const userId = req.user.id;

    if (!messageType) {
      return res.status(400).json({
        success: false,
        message: 'Message type is required'
      });
    }

    const pricing = await pricingService.updatePricing(messageType, req.body, userId);
    
    res.status(201).json({
      success: true,
      data: pricing,
      message: 'Pricing created successfully'
    });

  } catch (error) {
    logger.error('Error creating pricing', {
      error: error.message,
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create pricing'
    });
  }
});

// Get pricing history
router.get('/:messageType/history', async (req, res) => {
  try {
    const { messageType } = req.params;
    const { currency } = req.query;

    const history = await pricingService.getPricingHistory(messageType, currency);
    
    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('Error getting pricing history', {
      error: error.message,
      messageType: req.params.messageType,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing history'
    });
  }
});

// Schedule pricing change
router.post('/schedule', async (req, res) => {
  try {
    const { messageType } = req.body;
    const userId = req.user.id;

    if (!messageType) {
      return res.status(400).json({
        success: false,
        message: 'Message type is required'
      });
    }

    const scheduledChange = await pricingService.schedulePricingChange(messageType, req.body, userId);
    
    res.status(201).json({
      success: true,
      data: scheduledChange,
      message: 'Pricing change scheduled successfully'
    });

  } catch (error) {
    logger.error('Error scheduling pricing change', {
      error: error.message,
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to schedule pricing change'
    });
  }
});

// Get scheduled changes
router.get('/scheduled/changes', async (req, res) => {
  try {
    const scheduledChanges = await pricingService.getScheduledChanges();
    
    res.json({
      success: true,
      data: scheduledChanges
    });

  } catch (error) {
    logger.error('Error getting scheduled changes', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduled changes'
    });
  }
});

// Calculate fee with priority
router.post('/calculate', async (req, res) => {
  try {
    const { messageType, priority = 'normal', currency = 'USD', volume = 0 } = req.body;

    if (!messageType) {
      return res.status(400).json({
        success: false,
        message: 'Message type is required'
      });
    }

    const feeCalculation = await pricingService.calculateFee(
      messageType, 
      priority, 
      currency, 
      parseInt(volume)
    );
    
    res.json({
      success: true,
      data: feeCalculation
    });

  } catch (error) {
    logger.error('Error calculating fee', {
      error: error.message,
      userId: req.user.id,
      body: req.body
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate fee'
    });
  }
});

// Get pricing statistics
router.get('/statistics/overview', async (req, res) => {
  try {
    const statistics = await pricingService.getPricingStatistics();
    
    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Error getting pricing statistics', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get pricing statistics'
    });
  }
});

// Delete pricing configuration
router.delete('/:messageType', async (req, res) => {
  try {
    const { messageType } = req.params;
    const { currency = 'USD' } = req.query;
    const userId = req.user.id;

    const deletedPricing = await pricingService.deletePricing(messageType, currency, userId);
    
    res.json({
      success: true,
      data: deletedPricing,
      message: 'Pricing deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting pricing', {
      error: error.message,
      messageType: req.params.messageType,
      currency: req.query.currency,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete pricing'
    });
  }
});

// Get supported message types and currencies
router.get('/config/supported', async (req, res) => {
  try {
    const messageTypes = pricingService.getSupportedMessageTypes();
    const currencies = pricingService.getSupportedCurrencies();
    
    res.json({
      success: true,
      data: {
        messageTypes,
        currencies
      }
    });

  } catch (error) {
    logger.error('Error getting supported configurations', {
      error: error.message,
      userId: req.user.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to get supported configurations'
    });
  }
});

export default router;
