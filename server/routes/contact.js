import express from 'express';
import { query } from '../config/database.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';
import emailService from '../services/emailService.js';

const router = express.Router();

router.post('/demo', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      company,
      jobTitle,
      phone,
      solutionInterest,
      message
    } = req.body;

    if (!firstName || !lastName || !email || !company) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and company are required'
      });
    }

    const result = await query(`
      INSERT INTO demo_requests (
        first_name, last_name, email, company, job_title, phone,
        solution_interest, message, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
      RETURNING *
    `, [firstName, lastName, email, company, jobTitle || null, phone || null, solutionInterest || null, message || null]);

    // Send admin notification
    await notificationService.sendAdminNotification('demo_request', {
      id: result.rows[0].id,
      firstName,
      lastName,
      email,
      company,
      solutionInterest,
      message
    });

    // Send confirmation email to user
    try {
      await emailService.sendDemoRequestConfirmation(email, {
        firstName,
        lastName,
        company,
        jobTitle,
        solutionInterest,
        phone
      });
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    res.json({
      success: true,
      message: 'Demo request submitted successfully. We will contact you soon!',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit demo request. Please try again later.'
    });
  }
});

router.post('/contact', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      company,
      subject,
      message
    } = req.body;

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    const result = await query(`
      INSERT INTO contact_submissions (
        first_name, last_name, email, company, subject, message, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'new')
      RETURNING *
    `, [firstName, lastName, email, company || null, subject, message]);

    // Send admin notification
    await notificationService.sendAdminNotification('contact_submission', {
      id: result.rows[0].id,
      firstName,
      lastName,
      email,
      company,
      subject,
      message
    });

    // Send confirmation email to user
    try {
      await emailService.sendContactSubmissionConfirmation(email, {
        firstName,
        lastName,
        company,
        subject
      });
    } catch (emailError) {
      console.warn('Failed to send confirmation email:', emailError);
      // Continue even if email fails
    }

    res.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
});

router.get('/demo-requests', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let queryText = 'SELECT * FROM demo_requests';
    const params = [];
    
    if (status) {
      queryText += ' WHERE status = $1';
      params.push(status);
    }
    
    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);
    const countResult = await query('SELECT COUNT(*) FROM demo_requests' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);

    res.json({
      success: true,
      requests: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching demo requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch demo requests'
    });
  }
});

router.get('/contact-submissions', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let queryText = 'SELECT * FROM contact_submissions';
    const params = [];
    
    if (status) {
      queryText += ' WHERE status = $1';
      params.push(status);
    }
    
    queryText += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, params);
    const countResult = await query('SELECT COUNT(*) FROM contact_submissions' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);

    res.json({
      success: true,
      submissions: result.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact submissions'
    });
  }
});

router.patch('/demo-requests/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

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

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(`
      UPDATE demo_requests
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Demo request not found'
      });
    }

    res.json({
      success: true,
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating demo request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update demo request'
    });
  }
});

router.patch('/contact-submissions/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

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

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const result = await query(`
      UPDATE contact_submissions
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating contact submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact submission'
    });
  }
});

export default router;

