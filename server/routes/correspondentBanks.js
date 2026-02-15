import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/security.js';
import smartRoutingService from '../services/smartRoutingService.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get correspondent banks for current tenant
router.get('/', authenticateToken, async (req, res) => {
  try {
    const banks = await smartRoutingService.getCorrespondentBanks();
    
    res.json({
      success: true,
      banks: banks
    });
  } catch (error) {
    console.error('Error fetching correspondent banks:', error);
    logger.error('Error fetching correspondent banks', {
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch correspondent banks',
      error: error.message
    });
  }
});

// Add correspondent bank (admin only)
router.post('/', authenticateToken, validateUserInput({
  name: { type: 'text', required: true, maxLength: 255 },
  bicCode: { type: 'bic', required: true },
  bankCode: { type: 'text', required: false, maxLength: 50 },
  address: { type: 'text', required: false, maxLength: 500 },
  country: { type: 'text', required: false, maxLength: 100 },
  currency: { type: 'text', required: false, maxLength: 3 },
  routingPreferences: { type: 'text', required: false }
}), async (req, res) => {
  try {
    // Check if user has admin permissions
    const userRole = await query(`
      SELECT role FROM tenant_users 
      WHERE user_id = $1 AND tenant_id = $2
    `, [req.user.id, req.user.tenantId]);

    if (userRole.rows.length === 0 || userRole.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin permissions required'
      });
    }

    const bankData = {
      name: req.body.name,
      bicCode: req.body.bicCode,
      bankCode: req.body.bankCode,
      address: req.body.address,
      country: req.body.country,
      currency: req.body.currency,
      routingPreferences: req.body.routingPreferences ? JSON.parse(req.body.routingPreferences) : {}
    };

    const bank = await smartRoutingService.addCorrespondentBank(bankData);
    
    logger.info('Correspondent bank added', {
      userId: req.user.id,
      bicCode: bankData.bicCode,
      name: bankData.name
    });

    res.json({
      success: true,
      message: 'Correspondent bank added successfully',
      bank: bank
    });
  } catch (error) {
    console.error('Error adding correspondent bank:', error);
    logger.error('Error adding correspondent bank', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to add correspondent bank',
      error: error.message
    });
  }
});

// Get routing options for a message
router.post('/routing-options', authenticateToken, validateUserInput({
  messageType: { type: 'text', required: true },
  receiverBIC: { type: 'bic', required: true },
  amount: { type: 'number', required: false },
  priority: { type: 'text', required: false },
  correspondentBank: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const messageData = {
      message_type: req.body.messageType,
      receiver_bic: req.body.receiverBIC,
      amount: req.body.amount,
      priority: req.body.priority || 'normal',
      correspondent_bank: req.body.correspondentBank
    };

    const routingResult = await smartRoutingService.routeMessage(messageData);
    
    // Get available routes (without executing)
    const factors = await smartRoutingService.analyzeMessage(messageData);
    const availableRoutes = await smartRoutingService.getAvailableRoutes(factors);
    
    // Add estimated delivery times
    const routesWithDelivery = availableRoutes.map(route => ({
      ...route,
      estimatedDelivery: new Date(Date.now() + (route.estimatedSpeed * 60 * 60 * 1000)).toLocaleString()
    }));

    res.json({
      success: true,
      routes: routesWithDelivery,
      selectedRoute: routingResult,
      factors: factors
    });
  } catch (error) {
    console.error('Error getting routing options:', error);
    logger.error('Error getting routing options', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get routing options',
      error: error.message
    });
  }
});

// Update correspondent bank
router.put('/:id', authenticateToken, validateUserInput({
  name: { type: 'text', required: false, maxLength: 255 },
  bicCode: { type: 'bic', required: false },
  bankCode: { type: 'text', required: false, maxLength: 50 },
  address: { type: 'text', required: false, maxLength: 500 },
  country: { type: 'text', required: false, maxLength: 100 },
  currency: { type: 'text', required: false, maxLength: 3 },
  isActive: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has admin permissions
    const userRole = await query(`
      SELECT role FROM tenant_users 
      WHERE user_id = $1 AND tenant_id = $2
    `, [req.user.id, req.user.tenantId]);

    if (userRole.rows.length === 0 || userRole.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin permissions required'
      });
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Build dynamic update query
    if (req.body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(req.body.name);
    }
    if (req.body.bicCode !== undefined) {
      updateFields.push(`bic_code = $${paramIndex++}`);
      updateValues.push(req.body.bicCode);
    }
    if (req.body.bankCode !== undefined) {
      updateFields.push(`bank_code = $${paramIndex++}`);
      updateValues.push(req.body.bankCode);
    }
    if (req.body.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      updateValues.push(req.body.address);
    }
    if (req.body.country !== undefined) {
      updateFields.push(`country = $${paramIndex++}`);
      updateValues.push(req.body.country);
    }
    if (req.body.currency !== undefined) {
      updateFields.push(`currency = $${paramIndex++}`);
      updateValues.push(req.body.currency);
    }
    if (req.body.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(req.body.isActive === 'true');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const result = await query(`
      UPDATE correspondent_banks 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Correspondent bank not found'
      });
    }

    logger.info('Correspondent bank updated', {
      userId: req.user.id,
      bankId: id,
      updates: updateFields
    });

    res.json({
      success: true,
      message: 'Correspondent bank updated successfully',
      bank: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating correspondent bank:', error);
    logger.error('Error updating correspondent bank', {
      userId: req.user.id,
      bankId: req.params.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update correspondent bank',
      error: error.message
    });
  }
});

// Delete correspondent bank
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has admin permissions
    const userRole = await query(`
      SELECT role FROM tenant_users 
      WHERE user_id = $1 AND tenant_id = $2
    `, [req.user.id, req.user.tenantId]);

    if (userRole.rows.length === 0 || userRole.rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin permissions required'
      });
    }

    const result = await query(`
      DELETE FROM correspondent_banks 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Correspondent bank not found'
      });
    }

    logger.info('Correspondent bank deleted', {
      userId: req.user.id,
      bankId: id,
      bankName: result.rows[0].name
    });

    res.json({
      success: true,
      message: 'Correspondent bank deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting correspondent bank:', error);
    logger.error('Error deleting correspondent bank', {
      userId: req.user.id,
      bankId: req.params.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete correspondent bank',
      error: error.message
    });
  }
});

// Get routing statistics
router.get('/routing-stats', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        rm.method,
        COUNT(*) as message_count,
        AVG(rm.estimated_cost) as avg_cost,
        AVG(rm.estimated_speed) as avg_speed,
        COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_count
      FROM routing_logs rm
      JOIN messages m ON rm.message_id = m.id
      WHERE rm.tenant_id = $1
        AND rm.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY rm.method
      ORDER BY message_count DESC
    `, [req.user.tenantId]);

    res.json({
      success: true,
      stats: result.rows
    });
  } catch (error) {
    console.error('Error getting routing statistics:', error);
    logger.error('Error getting routing statistics', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get routing statistics',
      error: error.message
    });
  }
});

export default router;
