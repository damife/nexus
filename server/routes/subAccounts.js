import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';

const router = express.Router();

// Create sub-account (parent user only)
router.post('/create', authenticate, async (req, res) => {
  try {
    const parentUserId = req.user.id;
    const {
      email,
      firstName,
      lastName,
      password,
      role = 'sub_user',
      permissions = []
    } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, last name, and password are required'
      });
    }

    // Check if parent user can create more sub-accounts
    const subAccountCount = await query(`
      SELECT COUNT(*) as count FROM users 
      WHERE parent_user_id = $1
    `, [parentUserId]);

    if (parseInt(subAccountCount.rows[0].count) >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum sub-account limit (5) reached'
      });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create sub-account
    const result = await query(`
      INSERT INTO users (
        email, first_name, last_name, password, role, 
        parent_user_id, permissions, email_verified, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'active')
      RETURNING id, email, first_name, last_name, role, created_at
    `, [
      email,
      firstName,
      lastName,
      hashedPassword,
      role,
      parentUserId,
      JSON.stringify(permissions)
    ]);

    logger.info('Sub-account created', {
      parentUserId,
      subAccountId: result.rows[0].id,
      email
    });

    res.status(201).json({
      success: true,
      message: 'Sub-account created successfully',
      subAccount: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating sub-account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-account'
    });
  }
});

// Get sub-accounts for parent user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Check if user is admin or parent user
    let queryText, params;
    
    if (req.user.role === 'admin') {
      // Admin can see all sub-accounts
      queryText = `
        SELECT 
          u.id, u.email, u.first_name, u.last_name, u.role, 
          u.status, u.created_at, u.last_login,
          p.email as parent_email,
          p.first_name as parent_first_name,
          p.last_name as parent_last_name
        FROM users u
        LEFT JOIN users p ON u.parent_user_id = p.id
        WHERE u.parent_user_id IS NOT NULL
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      params = [parseInt(limit), parseInt(offset)];
    } else {
      // Parent user can only see their own sub-accounts
      queryText = `
        SELECT 
          id, email, first_name, last_name, role, status, 
          created_at, last_login, permissions
        FROM users 
        WHERE parent_user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      params = [userId, parseInt(limit), parseInt(offset)];
    }

    const result = await query(queryText, params);

    // Get total count
    let countQuery, countParams;
    if (req.user.role === 'admin') {
      countQuery = 'SELECT COUNT(*) as total FROM users WHERE parent_user_id IS NOT NULL';
      countParams = [];
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM users WHERE parent_user_id = $1';
      countParams = [userId];
    }

    const countResult = await query(countQuery, countParams);

    res.json({
      success: true,
      subAccounts: result.rows,
      total: parseInt(countResult.rows[0].total),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching sub-accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-accounts'
    });
  }
});

// Update sub-account permissions
router.patch('/:id/permissions', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const userId = req.user.id;

    // Check if user owns this sub-account or is admin
    const subAccount = await query(`
      SELECT parent_user_id FROM users 
      WHERE id = $1 AND parent_user_id IS NOT NULL
    `, [id]);

    if (subAccount.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sub-account not found'
      });
    }

    if (req.user.role !== 'admin' && subAccount.rows[0].parent_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update permissions
    const result = await query(`
      UPDATE users 
      SET permissions = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, permissions
    `, [JSON.stringify(permissions), id]);

    logger.info('Sub-account permissions updated', {
      subAccountId: id,
      updatedBy: userId,
      permissions
    });

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      subAccount: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating sub-account permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions'
    });
  }
});

// Deactivate sub-account
router.patch('/:id/deactivate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns this sub-account or is admin
    const subAccount = await query(`
      SELECT parent_user_id FROM users 
      WHERE id = $1 AND parent_user_id IS NOT NULL
    `, [id]);

    if (subAccount.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sub-account not found'
      });
    }

    if (req.user.role !== 'admin' && subAccount.rows[0].parent_user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Deactivate sub-account
    const result = await query(`
      UPDATE users 
      SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, first_name, last_name, status
    `, [id]);

    logger.info('Sub-account deactivated', {
      subAccountId: id,
      deactivatedBy: userId
    });

    res.json({
      success: true,
      message: 'Sub-account deactivated successfully',
      subAccount: result.rows[0]
    });

  } catch (error) {
    console.error('Error deactivating sub-account:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate sub-account'
    });
  }
});

// Get available permissions
router.get('/permissions/available', authenticate, async (req, res) => {
  try {
    const availablePermissions = [
      {
        key: 'view_messages',
        label: 'View Messages',
        description: 'Can view sent and received messages'
      },
      {
        key: 'send_messages',
        label: 'Send Messages',
        description: 'Can create and send new messages'
      },
      {
        key: 'view_balance',
        label: 'View Balance',
        description: 'Can view account balance and transactions'
      },
      {
        key: 'view_reports',
        label: 'View Reports',
        description: 'Can view basic reports and statistics'
      },
      {
        key: 'manage_contacts',
        label: 'Manage Contacts',
        description: 'Can manage contact list and beneficiaries'
      },
      {
        key: 'view_compliance',
        label: 'View Compliance',
        description: 'Can view compliance and audit information'
      }
    ];

    res.json({
      success: true,
      permissions: availablePermissions
    });

  } catch (error) {
    console.error('Error getting available permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get permissions'
    });
  }
});

// Get sub-account statistics
router.get('/statistics/overview', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_sub_accounts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive,
        COUNT(CASE WHEN last_login >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recently_active
      FROM users 
      WHERE parent_user_id IS NOT NULL
    `);

    const byParentResult = await query(`
      SELECT 
        p.email as parent_email,
        p.first_name as parent_first_name,
        p.last_name as parent_last_name,
        COUNT(u.id) as sub_account_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_count
      FROM users p
      LEFT JOIN users u ON u.parent_user_id = p.id
      WHERE u.parent_user_id IS NOT NULL
      GROUP BY p.id, p.email, p.first_name, p.last_name
      ORDER BY sub_account_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      statistics: {
        overview: result.rows[0],
        byParent: byParentResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting sub-account statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
});

export default router;
