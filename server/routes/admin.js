import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { apiSecurity, sanitizeRequestBody } from '../middleware/security.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));
router.use(sanitizeRequestBody);
router.use(...apiSecurity);

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalBanks: (await query('SELECT COUNT(*) FROM banks')).rows[0].count,
      totalUsers: (await query('SELECT COUNT(*) FROM users')).rows[0].count,
      totalMessages: (await query('SELECT COUNT(*) FROM messages')).rows[0].count,
      activeUsers: (await query('SELECT COUNT(*) FROM users WHERE bank_id IS NOT NULL')).rows[0].count
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Bank routes
router.get('/banks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM banks ORDER BY name');
    res.json({ success: true, banks: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/banks', async (req, res) => {
  try {
    const { name, bic, address, country, customerNumber, registrationNumber } = req.body;
    
    const result = await query(`
      INSERT INTO banks (name, bic, address, country, customer_number, registration_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, bic.toUpperCase(), address, country, customerNumber, registrationNumber]);

    res.json({ success: true, bank: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ success: false, message: 'BIC already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// User routes
router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*, b.name as bank_name 
      FROM users u 
      LEFT JOIN banks b ON u.bank_id = b.id 
      ORDER BY u.name
    `);
    res.json({ success: true, users: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, status = 'active' } = req.body;
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 10);
    const emailVerificationService = (await import('../services/emailVerificationService.js')).default;

    const result = await query(`
      INSERT INTO users (name, email, password, role, status, email_verified, two_factor_required)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, email, role, status
    `, [name, email, hashedPassword, role, status, role === 'admin', true]);

    const newUser = result.rows[0];

    // Send verification email if not admin (admins are auto-verified)
    if (role !== 'admin') {
      await emailVerificationService.sendVerificationEmail(newUser.id, email, name);
    }

    res.json({ success: true, user: newUser });
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ success: false, message: 'Email already exists' });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Update user status (ban/block/unblock)
router.patch('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'banned', 'blocked', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Get user info before updating
    const userResult = await query(`
      SELECT name, email, status FROM users WHERE id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Update user status
    await query(`
      UPDATE users 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, id]);

    // Send email notification if user is being disabled
    if (status !== 'active' && user.status === 'active') {
      try {
        const emailService = (await import('../services/emailService.js')).default;
        await emailService.sendUserDisabledNotification(
          user.email,
          user.name,
          `Account status changed to: ${status}`
        );
        console.log('User disabled notification sent', { userId: id, email: user.email });
      } catch (emailError) {
        console.log('Failed to send user disabled notification', { 
          userId: id, 
          email: user.email, 
          error: emailError.message 
        });
      }
    }

    res.json({
      success: true,
      message: 'User status updated successfully'
    });

  } catch (error) {
    console.log('Error updating user status', {
      error: error.message,
      userId: req.params.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!['admin', 'user', 'maker', 'checker'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const result = await query(`
      UPDATE users 
      SET role = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, role, status
    `, [role, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Enable/disable FIN download for user
router.patch('/users/:id/fin-download', async (req, res) => {
  try {
    const { canDownload } = req.body;
    const { id } = req.params;

    const result = await query(`
      UPDATE users 
      SET can_download_fin = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, email, can_download_fin
    `, [canDownload, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/assign-bank', async (req, res) => {
  try {
    const { userId, bankId } = req.body;
    
    await query('UPDATE users SET bank_id = $1 WHERE id = $2', [bankId, userId]);
    res.json({ success: true, message: 'Bank assigned successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Demo Requests Management
router.get('/demo-requests', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM demo_requests 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, demoRequests: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/demo-requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await query('UPDATE demo_requests SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Demo request status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Contact Submissions Management
router.get('/contact-submissions', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM contact_submissions 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, contactSubmissions: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/contact-submissions/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await query('UPDATE contact_submissions SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true, message: 'Contact submission status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Careers Management
router.get('/careers', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM careers 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, careers: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/careers', async (req, res) => {
  try {
    const { title, description, requirements, location, type, salary } = req.body;
    
    const result = await query(`
      INSERT INTO careers (title, description, requirements, location, type, salary)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, description, requirements, location, type, salary]);
    
    res.json({ success: true, career: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/careers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, requirements, location, type, salary, status } = req.body;
    
    const result = await query(`
      UPDATE careers 
      SET title = $1, description = $2, requirements = $3, location = $4, type = $5, salary = $6, status = $7
      WHERE id = $8
      RETURNING *
    `, [title, description, requirements, location, type, salary, status, id]);
    
    res.json({ success: true, career: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/careers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM careers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Career posting deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// News Management
router.get('/news', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM news 
      ORDER BY created_at DESC
    `);
    res.json({ success: true, news: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/news', async (req, res) => {
  try {
    const { title, content, excerpt, author, category, featured } = req.body;
    
    const result = await query(`
      INSERT INTO news (title, content, excerpt, author, category, featured)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [title, content, excerpt, author, category, featured]);
    
    res.json({ success: true, news: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, excerpt, author, category, featured, status } = req.body;
    
    const result = await query(`
      UPDATE news 
      SET title = $1, content = $2, excerpt = $3, author = $4, category = $5, featured = $6, status = $7
      WHERE id = $8
      RETURNING *
    `, [title, content, excerpt, author, category, featured, status, id]);
    
    res.json({ success: true, news: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM news WHERE id = $1', [id]);
    res.json({ success: true, message: 'News article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

