import express from 'express';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authenticate);

// Get user profile information
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT 
        id, name, email, phone, role, status, created_at, updated_at,
        (SELECT COUNT(*) FROM messages WHERE created_by = $1) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE created_by = $1 AND status = 'sent') as successful_messages,
        (SELECT EXTRACT(DAYS FROM CURRENT_TIMESTAMP - created_at)) as days_active
      FROM users 
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name and email are required' 
      });
    }

    // Check if email is already taken by another user
    const emailCheck = await query(`
      SELECT id FROM users WHERE email = $1 AND id != $2
    `, [email, userId]);

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already taken by another user' 
      });
    }

    // Update user profile
    const result = await query(`
      UPDATE users 
      SET name = $1, email = $2, phone = COALESCE($3, phone), updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, email, phone, role, status, created_at, updated_at
    `, [name, email, phone, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's bank info
router.get('/bank-info', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.* FROM banks b
      INNER JOIN users u ON u.bank_id = b.id
      WHERE u.id = $1
    `, [req.user.id]);

    res.json({ success: true, bank: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const stats = {
      totalMessages: (await query(`
        SELECT COUNT(*) FROM messages 
        WHERE created_by = $1
      `, [userId])).rows[0].count,
      pending: (await query(`
        SELECT COUNT(*) FROM messages 
        WHERE created_by = $1 AND status = 'pending'
      `, [userId])).rows[0].count,
      completed: (await query(`
        SELECT COUNT(*) FROM messages 
        WHERE created_by = $1 AND (status = 'sent' OR status = 'completed')
      `, [userId])).rows[0].count,
      today: (await query(`
        SELECT COUNT(*) FROM messages 
        WHERE created_by = $1 AND DATE(created_at) = $2
      `, [userId, today])).rows[0].count
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
router.patch('/profile', async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Update name
    if (name && name !== user.name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }

    // Update email
    if (email && email !== user.email) {
      // Check if email already exists
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No changes provided' });
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    // Update user
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, status
    `;

    const result = await query(updateQuery, values);

    res.json({
      success: true,
      user: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

