import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Submit complaint (authenticated users)
router.post('/submit', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      priority = 'medium'
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and category are required'
      });
    }

    const result = await query(`
      INSERT INTO user_complaints (
        user_id, title, description, category, priority, status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [userId, title, description, category, priority]);

    // Send admin notification
    await notificationService.sendAdminNotification('user_complaint', {
      id: result.rows[0].id,
      userId,
      title,
      description,
      category,
      priority,
      userName: req.user.email
    });

    res.json({
      success: true,
      message: 'Complaint submitted successfully. We will review it soon.',
      complaint: result.rows[0]
    });

  } catch (error) {
    console.error('Error submitting complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit complaint. Please try again later.'
    });
  }
});

// Get all complaints (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, category, priority, limit = 50, offset = 0 } = req.query;
    
    let queryText = `
      SELECT 
        c.*,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM user_complaints c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND c.status = $${paramCount++}`;
      params.push(status);
    }

    if (category) {
      queryText += ` AND c.category = $${paramCount++}`;
      params.push(category);
    }

    if (priority) {
      queryText += ` AND c.priority = $${paramCount++}`;
      params.push(priority);
    }

    queryText += ` ORDER BY c.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_complaints c
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND c.status = $${countParamCount++}`;
      countParams.push(status);
    }

    if (category) {
      countQuery += ` AND c.category = $${countParamCount++}`;
      countParams.push(category);
    }

    if (priority) {
      countQuery += ` AND c.priority = $${countParamCount++}`;
      countParams.push(priority);
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      complaints: result.rows,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints'
    });
  }
});

// Get user's own complaints
router.get('/my-complaints', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(`
      SELECT * FROM user_complaints 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM user_complaints WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      complaints: result.rows,
      total: parseInt(countResult.rows[0].total)
    });

  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch complaints'
    });
  }
});

// Update complaint status (admin only)
router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, resolution } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);
    }

    if (adminNotes !== undefined) {
      updates.push(`admin_notes = $${paramCount++}`);
      params.push(adminNotes);
    }

    if (resolution !== undefined) {
      updates.push(`resolution = $${paramCount++}`);
      params.push(resolution);
    }

    if (status === 'resolved' || status === 'closed') {
      updates.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(`
      UPDATE user_complaints
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      complaint: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update complaint'
    });
  }
});

// Get complaint statistics (admin only)
router.get('/statistics/overview', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
      FROM user_complaints
    `);

    const categoryResult = await query(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(CASE WHEN status = 'resolved' THEN 
          EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
        END) as avg_resolution_hours
      FROM user_complaints
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      statistics: {
        overview: result.rows[0],
        byCategory: categoryResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting complaint statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

export default router;
