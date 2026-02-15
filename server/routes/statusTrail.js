import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const router = express.Router();

// Get status trail for a specific message
router.get('/message/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this message
    const messageCheck = await query(`
      SELECT id FROM messages 
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId]);

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Get status trail
    const result = await query(`
      SELECT 
        id,
        status,
        status_label,
        description,
        metadata,
        created_at
      FROM message_status_trail 
      WHERE message_id = $1
      ORDER BY created_at ASC
    `, [messageId]);

    res.json({
      success: true,
      statusTrail: result.rows
    });
  } catch (error) {
    console.error('Error fetching status trail:', error);
    logger.error('Error fetching status trail', {
      messageId: req.params.messageId,
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status trail',
      error: error.message
    });
  }
});

// Get status trail for all user messages
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0, status } = req.query;

    let whereClause = 'WHERE m.user_id = $1';
    let queryParams = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND mst.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    // Get status trail with message information
    const result = await query(`
      SELECT 
        mst.id,
        mst.message_id,
        mst.status,
        mst.status_label,
        mst.description,
        mst.metadata,
        mst.created_at,
        m.message_type,
        m.receiver_bic,
        m.amount,
        m.currency,
        m.tracking_id
      FROM message_status_trail mst
      JOIN messages m ON mst.message_id = m.id
      ${whereClause}
      ORDER BY mst.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM message_status_trail mst
      JOIN messages m ON mst.message_id = m.id
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      statusTrail: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching user status trail:', error);
    logger.error('Error fetching user status trail', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status trail',
      error: error.message
    });
  }
});

// Get status trail for admin (all messages)
router.get('/admin', authenticateToken, async (req, res) => {
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

    const { limit = 50, offset = 0, status, messageType, userId } = req.query;
    const tenantId = req.user.tenantId;

    let whereClause = 'WHERE m.tenant_id = $1';
    let queryParams = [tenantId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND mst.status = $${paramIndex++}`;
      queryParams.push(status);
    }

    if (messageType) {
      whereClause += ` AND m.message_type = $${paramIndex++}`;
      queryParams.push(messageType);
    }

    if (userId) {
      whereClause += ` AND m.user_id = $${paramIndex++}`;
      queryParams.push(userId);
    }

    // Get status trail with message and user information
    const result = await query(`
      SELECT 
        mst.id,
        mst.message_id,
        mst.status,
        mst.status_label,
        mst.description,
        mst.metadata,
        mst.created_at,
        m.message_type,
        m.receiver_bic,
        m.amount,
        m.currency,
        m.tracking_id,
        m.routing_method,
        m.routing_cost,
        u.name as user_name,
        u.email as user_email
      FROM message_status_trail mst
      JOIN messages m ON mst.message_id = m.id
      JOIN users u ON m.user_id = u.id
      ${whereClause}
      ORDER BY mst.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...queryParams, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM message_status_trail mst
      JOIN messages m ON mst.message_id = m.id
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      statusTrail: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching admin status trail:', error);
    logger.error('Error fetching admin status trail', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status trail',
      error: error.message
    });
  }
});

// Add status trail entry (internal use)
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { messageId, status, statusLabel, description, metadata = {} } = req.body;
    const userId = req.user.id;

    // Verify user has access to this message
    const messageCheck = await query(`
      SELECT id FROM messages 
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId]);

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Add status trail entry
    const result = await query(`
      INSERT INTO message_status_trail 
      (message_id, status, status_label, description, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [messageId, status, statusLabel, description, JSON.stringify(metadata)]);

    logger.info('Status trail entry added', {
      messageId,
      status,
      userId
    });

    res.json({
      success: true,
      message: 'Status trail entry added successfully',
      entry: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding status trail entry:', error);
    logger.error('Error adding status trail entry', {
      messageId: req.body.messageId,
      status: req.body.status,
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to add status trail entry',
      error: error.message
    });
  }
});

// Get status statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    // Get status statistics for user
    const userStats = await query(`
      SELECT 
        mst.status,
        COUNT(*) as count,
        MAX(mst.created_at) as last_updated
      FROM message_status_trail mst
      JOIN messages m ON mst.message_id = m.id
      WHERE m.user_id = $1
      GROUP BY mst.status
      ORDER BY count DESC
    `, [userId]);

    // Get overall tenant statistics (for admin users)
    let tenantStats = [];
    const userRole = await query(`
      SELECT role FROM tenant_users 
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    if (userRole.rows.length > 0 && userRole.rows[0].role === 'admin') {
      const tenantResult = await query(`
        SELECT 
          mst.status,
          COUNT(*) as count,
          MAX(mst.created_at) as last_updated
        FROM message_status_trail mst
        JOIN messages m ON mst.message_id = m.id
        WHERE m.tenant_id = $1
        GROUP BY mst.status
        ORDER BY count DESC
      `, [tenantId]);
      tenantStats = tenantResult.rows;
    }

    res.json({
      success: true,
      userStats: userStats.rows,
      tenantStats: tenantStats
    });
  } catch (error) {
    console.error('Error fetching status statistics:', error);
    logger.error('Error fetching status statistics', {
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status statistics',
      error: error.message
    });
  }
});

// Get status timeline for a message (formatted for display)
router.get('/timeline/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this message
    const messageCheck = await query(`
      SELECT id, status FROM messages 
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId]);

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or access denied'
      });
    }

    // Get status trail with timeline formatting
    const result = await query(`
      SELECT 
        id,
        status,
        status_label,
        description,
        metadata,
        created_at,
        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at))) * 60 as duration_minutes
      FROM message_status_trail 
      WHERE message_id = $1
      ORDER BY created_at ASC
    `, [messageId]);

    // Format timeline
    const timeline = result.rows.map((entry, index) => ({
      id: entry.id,
      status: entry.status,
      statusLabel: entry.status_label,
      description: entry.description,
      metadata: entry.metadata,
      createdAt: entry.created_at,
      duration: entry.duration_minutes ? Math.round(entry.duration_minutes) : null,
      isCurrent: entry.status === messageCheck.rows[0].status,
      stepNumber: index + 1
    }));

    res.json({
      success: true,
      timeline: timeline,
      currentStatus: messageCheck.rows[0].status
    });
  } catch (error) {
    console.error('Error fetching status timeline:', error);
    logger.error('Error fetching status timeline', {
      messageId: req.params.messageId,
      userId: req.user.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch status timeline',
      error: error.message
    });
  }
});

export default router;
