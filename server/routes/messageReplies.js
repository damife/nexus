import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import multer from 'multer';
import path from 'path';
import { sanitizeRequestBody, paymentSecurity } from '../middleware/security.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/swift-copies/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'swift-copy-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get user's reply permissions
router.get('/permissions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(`
      SELECT can_view_replies, can_download_swift_copies
      FROM user_permissions
      WHERE user_id = $1
    `, [userId]);
    
    const permissions = result.rows[0] || {
      can_view_replies: false,
      can_download_swift_copies: false
    };
    
    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    logger.error('Error getting user permissions', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get message replies for a user
router.get('/my-replies', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.query;
    
    // Check if user has permission to view replies
    const permResult = await query(`
      SELECT can_view_replies
      FROM user_permissions
      WHERE user_id = $1
    `, [userId]);
    
    const permissions = permResult.rows[0];
    if (!permissions || !permissions.can_view_replies) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view replies. Please contact your administrator.'
      });
    }
    
    // Get replies for user's messages
    let repliesQuery = `
      SELECT mr.*, m.sender_bic, m.receiver_bic, m.message_type, m.utr,
             m.created_at as message_date, m.amount, m.currency
      FROM message_replies mr
      INNER JOIN messages m ON mr.message_id = m.id
      WHERE m.user_id = $1
    `;
    const queryParams = [userId];
    
    if (messageId) {
      repliesQuery += ' AND mr.message_id = $2';
      queryParams.push(messageId);
    }
    
    repliesQuery += ' ORDER BY mr.created_at DESC';
    
    const result = await query(repliesQuery, queryParams);
    
    res.json({
      success: true,
      replies: result.rows
    });
  } catch (error) {
    logger.error('Error getting message replies', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get SWIFT copy availability for user
router.get('/swift-copies/my-availability', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.query;
    
    // Check if user has permission to download SWIFT copies
    const permResult = await query(`
      SELECT can_download_swift_copies
      FROM user_permissions
      WHERE user_id = $1
    `, [userId]);
    
    const permissions = permResult.rows[0];
    if (!permissions || !permissions.can_download_swift_copies) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download SWIFT copies. Please contact your administrator.'
      });
    }
    
    // Get SWIFT copy availability
    let copiesQuery = `
      SELECT sc.*, m.sender_bic, m.receiver_bic, m.message_type, m.utr,
             m.created_at as message_date, m.amount, m.currency
      FROM swift_copies sc
      INNER JOIN messages m ON sc.message_id = m.id
      WHERE m.user_id = $1
    `;
    const queryParams = [userId];
    
    if (messageId) {
      copiesQuery += ' AND sc.message_id = $2';
      queryParams.push(messageId);
    }
    
    copiesQuery += ' ORDER BY sc.created_at DESC';
    
    const result = await query(copiesQuery, queryParams);
    
    res.json({
      success: true,
      copies: result.rows
    });
  } catch (error) {
    logger.error('Error getting SWIFT copies', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Download SWIFT copy
router.get('/swift-copies/download/:copyId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { copyId } = req.params;
    
    // Check permissions
    const permResult = await query(`
      SELECT can_download_swift_copies
      FROM user_permissions
      WHERE user_id = $1
    `, [userId]);
    
    const permissions = permResult.rows[0];
    if (!permissions || !permissions.can_download_swift_copies) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to download SWIFT copies. Please contact your administrator.'
      });
    }
    
    // Get copy info and verify ownership
    const copyResult = await query(`
      SELECT sc.*, m.user_id
      FROM swift_copies sc
      INNER JOIN messages m ON sc.message_id = m.id
      WHERE sc.id = $1 AND m.user_id = $2
    `, [copyId, userId]);
    
    if (copyResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'SWIFT copy not found'
      });
    }
    
    const copy = copyResult.rows[0];
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(copy.file_path)) {
      return res.status(404).json({
        success: false,
        message: 'SWIFT copy file not found'
      });
    }
    
    // Download file
    res.download(copy.file_path, copy.original_filename);
  } catch (error) {
    logger.error('Error downloading SWIFT copy', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get raw SWIFT FIN for user's message
router.get('/raw-fin/:messageId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    
    // Get message and verify ownership
    const result = await query(`
      SELECT id, utr, message_type, sender_bic, receiver_bic, 
             content, status, created_at, amount, currency
      FROM messages
      WHERE id = $1 AND user_id = $2
    `, [messageId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    const message = result.rows[0];
    
    res.json({
      success: true,
      message: {
        id: message.id,
        utr: message.utr,
        messageType: message.message_type,
        senderBIC: message.sender_bic,
        receiverBIC: message.receiver_bic,
        content: message.content,
        status: message.status,
        createdAt: message.created_at,
        amount: message.amount,
        currency: message.currency
      }
    });
  } catch (error) {
    logger.error('Error getting raw SWIFT FIN', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin routes below

// Get all users for permission management (Admin only)
router.get('/admin/users', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.email, u.role, u.bank_id, b.name as bank_name,
             COALESCE(up.can_view_replies, false) as can_view_replies,
             COALESCE(up.can_download_swift_copies, false) as can_download_swift_copies
      FROM users u
      LEFT JOIN banks b ON u.bank_id = b.id
      LEFT JOIN user_permissions up ON u.id = up.user_id
      ORDER BY u.username
    `);
    
    res.json({
      success: true,
      users: result.rows
    });
  } catch (error) {
    logger.error('Error getting users for admin', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user permissions (Admin only)
router.put('/admin/users/:userId/permissions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { can_view_replies, can_download_swift_copies } = req.body;
    
    await query(`
      INSERT INTO user_permissions (user_id, can_view_replies, can_download_swift_copies)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        can_view_replies = EXCLUDED.can_view_replies,
        can_download_swift_copies = EXCLUDED.can_download_swift_copies,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, can_view_replies, can_download_swift_copies]);
    
    res.json({
      success: true,
      message: 'User permissions updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user permissions', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload reply for message (Admin only) - Text replies only
router.post('/admin/replies', authenticate, requireRole('admin'), sanitizeRequestBody, ...paymentSecurity, upload.single('replyFile'), async (req, res) => {
  try {
    const { messageId, content, status } = req.body;
    
    // Validate required fields
    if (!messageId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and content are required for text replies'
      });
    }
    
    // Verify message exists
    const messageResult = await query('SELECT id, utr FROM messages WHERE id = $1', [messageId]);
    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Insert text reply (reply_type is always 'text')
    const replyResult = await query(`
      INSERT INTO message_replies (message_id, reply_type, content, status, file_path, original_filename, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      messageId,
      'text', // Always text for replies
      content, // Text content from receiving bank
      status || 'received',
      req.file ? req.file.path : null,
      req.file ? req.file.originalname : null,
      req.user.id
    ]);
    
    // Update message status
    await query(`
      UPDATE messages 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status || 'replied', messageId]);
    
    res.json({
      success: true,
      message: 'Text reply uploaded successfully',
      reply: replyResult.rows[0]
    });
  } catch (error) {
    logger.error('Error uploading reply', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Upload SWIFT copy (Admin only) - PDF files only
router.post('/admin/swift-copies', authenticate, requireRole('admin'), sanitizeRequestBody, ...paymentSecurity, upload.single('swiftCopy'), async (req, res) => {
  try {
    const { messageId, copyType } = req.body;
    
    // Validate required fields
    if (!messageId || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and PDF file are required'
      });
    }
    
    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: 'Only PDF files are allowed for SWIFT copies'
      });
    }
    
    // Verify message exists
    const messageResult = await query('SELECT id, utr FROM messages WHERE id = $1', [messageId]);
    if (messageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Insert SWIFT copy (PDF only)
    const copyResult = await query(`
      INSERT INTO swift_copies (message_id, copy_type, file_path, original_filename, file_size, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      messageId,
      copyType || 'original',
      req.file.path,
      req.file.originalname,
      req.file.size,
      req.user.id
    ]);
    
    res.json({
      success: true,
      message: 'SWIFT PDF copy uploaded successfully',
      copy: copyResult.rows[0]
    });
  } catch (error) {
    logger.error('Error uploading SWIFT copy', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update message status (Admin/Operator only)
router.put('/admin/messages/:messageId/status', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, notes } = req.body;
    
    // Check if user has permission (admin or operator)
    if (req.user.role !== 'admin' && req.user.role !== 'operator') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    // Update message status
    await query(`
      UPDATE messages 
      SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status, notes, messageId]);
    
    // Add to status trail
    await query(`
      INSERT INTO message_status_trail (message_id, status, notes, changed_by)
      VALUES ($1, $2, $3, $4)
    `, [messageId, status, notes, req.user.id]);
    
    res.json({
      success: true,
      message: 'Message status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating message status', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get message status trail (Admin/Operator only)
router.get('/admin/messages/:messageId/status-trail', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'operator') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    const result = await query(`
      SELECT mst.*, u.username, u.role
      FROM message_status_trail mst
      INNER JOIN users u ON mst.changed_by = u.id
      WHERE mst.message_id = $1
      ORDER BY mst.created_at DESC
    `, [messageId]);
    
    res.json({
      success: true,
      trail: result.rows
    });
  } catch (error) {
    logger.error('Error getting status trail', { error: error.message });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
