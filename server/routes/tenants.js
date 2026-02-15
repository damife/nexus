import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateUserInput } from '../middleware/security.js';
import tenantConfig from '../config/tenant.js';
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';

const router = express.Router();

// All tenant routes require authentication
router.use(authenticate);

// Get all tenants (admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        t.*,
        COUNT(tu.user_id) as user_count
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      GROUP BY t.id
      ORDER BY t.name
    `);

    res.json({
      success: true,
      tenants: result.rows
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    logger.error('Error fetching tenants', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenants'
    });
  }
});

// Create new tenant (admin only)
router.post('/', requireRole('admin'), validateUserInput({
  name: { type: 'text', required: true, maxLength: 255 },
  domain: { type: 'text', required: false, maxLength: 255 },
  bicCode: { type: 'bic', required: false },
  settings: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { name, domain, bicCode, settings } = req.body;

    const result = await query(`
      INSERT INTO tenants (name, domain, bic_code, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      name,
      domain || null,
      bicCode || null,
      settings ? JSON.stringify(settings) : '{}'
    ]);

    logger.info('Tenant created', {
      tenantId: result.rows[0].id,
      name: name,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Tenant created successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    logger.error('Error creating tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message
    });
  }
});

// Update tenant (admin only)
router.put('/:id', requireRole('admin'), validateUserInput({
  name: { type: 'text', required: false, maxLength: 255 },
  domain: { type: 'text', required: false, maxLength: 255 },
  bicCode: { type: 'bic', required: false },
  isActive: { type: 'text', required: false },
  settings: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { id } = req.params;
    
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (req.body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(req.body.name);
    }
    if (req.body.domain !== undefined) {
      updateFields.push(`domain = $${paramIndex++}`);
      updateValues.push(req.body.domain);
    }
    if (req.body.bicCode !== undefined) {
      updateFields.push(`bic_code = $${paramIndex++}`);
      updateValues.push(req.body.bicCode);
    }
    if (req.body.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(req.body.isActive === 'true');
    }
    if (req.body.settings !== undefined) {
      updateFields.push(`settings = $${paramIndex++}`);
      updateValues.push(JSON.stringify(req.body.settings));
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
      UPDATE tenants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    logger.info('Tenant updated', {
      tenantId: id,
      updatedBy: req.user.id,
      updates: updateFields
    });

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tenant:', error);
    logger.error('Error updating tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update tenant',
      error: error.message
    });
  }
});

// Delete tenant (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tenant has users
    const userCount = await query(`
      SELECT COUNT(*) as count FROM tenant_users WHERE tenant_id = $1
    `, [id]);

    if (parseInt(userCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tenant with assigned users'
      });
    }

    const result = await query(`
      DELETE FROM tenants 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    logger.info('Tenant deleted', {
      tenantId: id,
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    logger.error('Error deleting tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete tenant',
      error: error.message
    });
  }
});

// Get tenant users (admin only)
router.get('/:id/users', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        tu.role as tenant_role,
        tu.permissions,
        tu.created_at as assigned_at
      FROM users u
      INNER JOIN tenant_users tu ON u.id = tu.user_id
      WHERE tu.tenant_id = $1
      ORDER BY u.name
    `, [id]);

    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    console.error('Error fetching tenant users:', error);
    logger.error('Error fetching tenant users', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant users'
    });
  }
});

// Assign user to tenant (admin only)
router.post('/:id/users', requireRole('admin'), validateUserInput({
  userId: { type: 'number', required: true },
  role: { type: 'text', required: true },
  permissions: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { userId, role, permissions } = req.body;

    // Check if user exists
    const userCheck = await query(`
      SELECT id, name, email FROM users WHERE id = $1
    `, [userId]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Assign user to tenant
    await tenantConfig.addUserToTenant(userId, role, permissions ? JSON.parse(permissions) : []);

    logger.info('User assigned to tenant', {
      tenantId,
      userId,
      role,
      assignedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'User assigned to tenant successfully',
      user: userCheck.rows[0]
    });
  } catch (error) {
    console.error('Error assigning user to tenant:', error);
    logger.error('Error assigning user to tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to assign user to tenant',
      error: error.message
    });
  }
});

// Remove user from tenant (admin only)
router.delete('/:id/users/:userId', requireRole('admin'), async (req, res) => {
  try {
    const { id: tenantId, userId } = req.params;

    const result = await query(`
      DELETE FROM tenant_users 
      WHERE tenant_id = $1 AND user_id = $2
      RETURNING *
    `, [tenantId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User assignment not found'
      });
    }

    logger.info('User removed from tenant', {
      tenantId,
      userId,
      removedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'User removed from tenant successfully'
    });
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    logger.error('Error removing user from tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to remove user from tenant',
      error: error.message
    });
  }
});

// Get current user's tenant information
router.get('/current', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's tenant assignments
    const result = await query(`
      SELECT 
        t.id,
        t.name,
        t.domain,
        t.bic_code,
        t.settings,
        tu.role as tenant_role,
        tu.permissions
      FROM tenants t
      INNER JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE tu.user_id = $1 AND t.is_active = true
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tenant assignment found'
      });
    }

    res.json({
      success: true,
      tenant: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user tenant:', error);
    logger.error('Error fetching user tenant', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant information'
    });
  }
});

// Create user and assign to tenant (admin only)
router.post('/:id/users/create', requireRole('admin'), validateUserInput({
  name: { type: 'text', required: true, maxLength: 255 },
  email: { type: 'email', required: true },
  password: { type: 'text', required: true, minLength: 8 },
  role: { type: 'text', required: true },
  tenantRole: { type: 'text', required: true },
  permissions: { type: 'text', required: false }
}), async (req, res) => {
  try {
    const { id: tenantId } = req.params;
    const { name, email, password, role, tenantRole, permissions } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await query(`
      INSERT INTO users (name, email, password, role, status, email_verified, two_factor_required)
      VALUES ($1, $2, $3, $4, 'active', $5, $6)
      RETURNING id, name, email, role, status, created_at
    `, [name, email, hashedPassword, role, role === 'admin', true]);

    const newUser = userResult.rows[0];

    // Assign user to tenant
    await tenantConfig.addUserToTenant(newUser.id, tenantRole, permissions ? JSON.parse(permissions) : []);

    logger.info('User created and assigned to tenant', {
      tenantId,
      userId: newUser.id,
      role,
      tenantRole,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      message: 'User created and assigned to tenant successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user for tenant:', error);
    logger.error('Error creating user for tenant', { error: error.message });
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create user for tenant',
      error: error.message
    });
  }
});

// Get tenant statistics (admin only)
router.get('/:id/stats', requireRole('admin'), async (req, res) => {
  try {
    const { id: tenantId } = req.params;

    const stats = await query(`
      SELECT 
        COUNT(DISTINCT tu.user_id) as total_users,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN tu.user_id END) as active_users,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT CASE WHEN m.status = 'completed' THEN m.id END) as completed_messages,
        COUNT(DISTINCT CASE WHEN m.status = 'failed' THEN m.id END) as failed_messages,
        COALESCE(SUM(CASE WHEN m.routing_cost IS NOT NULL THEN m.routing_cost ELSE 0 END), 0) as total_routing_costs
      FROM tenants t
      LEFT JOIN tenant_users tu ON t.id = tu.tenant_id
      LEFT JOIN users u ON tu.user_id = u.id
      LEFT JOIN messages m ON u.id = m.user_id
      WHERE t.id = $1
    `, [tenantId]);

    res.json({
      success: true,
      stats: stats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tenant statistics:', error);
    logger.error('Error fetching tenant statistics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tenant statistics'
    });
  }
});

export default router;
