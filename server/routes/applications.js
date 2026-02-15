import express from 'express';
import multer from 'multer';
import path from 'path';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX files
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Submit job application
router.post('/submit', upload.single('resume'), [
  body('firstName').notEmpty().trim().withMessage('First name is required'),
  body('lastName').notEmpty().trim().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('position').notEmpty().trim().withMessage('Position is required'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('portfolio').optional().isURL().withMessage('Invalid portfolio URL'),
  body('linkedin').optional().isURL().withMessage('Invalid LinkedIn URL'),
  body('github').optional().isURL().withMessage('Invalid GitHub URL'),
  body('experience').optional().isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0-50 years'),
  body('education').optional().isIn(['High School', 'Bachelor', 'Master', 'PhD', 'Other']).withMessage('Invalid education level'),
  body('availability').optional().isIn(['Immediate', '2 weeks', '1 month', '2 months', '3+ months']).withMessage('Invalid availability'),
  body('workLocation').optional().isIn(['Remote', 'On-site', 'Hybrid']).withMessage('Invalid work location preference')
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      coverLetter,
      portfolio,
      linkedin,
      github,
      experience,
      currentCompany,
      currentPosition,
      education,
      skills,
      availability,
      salary,
      workLocation,
      referral
    } = req.body;

    // Handle resume file
    let resumeFilename = null;
    let resumePath = null;
    if (req.file) {
      resumeFilename = req.file.filename;
      resumePath = req.file.path;
    }

    // Insert application into database
    const result = await query(`
      INSERT INTO applications (
        first_name, last_name, email, phone, position_applied, cover_letter,
        portfolio_url, linkedin_url, github_url, resume_filename, resume_path,
        experience_years, current_company, current_position, education_level,
        skills, availability, salary_expectation, work_location_preference,
        referral_source, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending')
      RETURNING *
    `, [
      firstName, lastName, email, phone, position, coverLetter,
      portfolio, linkedin, github, resumeFilename, resumePath,
      experience, currentCompany, currentPosition, education,
      skills, availability, salary, workLocation, referral
    ]);

    const application = result.rows[0];

    // Send admin notification
    try {
      await notificationService.sendAdminNotification('new_application', {
        applicantName: `${firstName} ${lastName}`,
        position: position,
        email: email,
        applicationId: application.id
      });
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
      // Continue even if notification fails
    }

    // Send confirmation email to applicant (optional)
    try {
      await notificationService.sendApplicantConfirmation(email, firstName, position);
    } catch (emailError) {
      console.error('Failed to send applicant confirmation:', emailError);
      // Continue even if email fails
    }

    res.json({
      success: true,
      message: 'Application submitted successfully!',
      application: {
        id: application.id,
        firstName: application.first_name,
        lastName: application.last_name,
        email: application.email,
        position: application.position_applied,
        submittedAt: application.created_at
      }
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again.'
    });
  }
});

// Get all applications (admin only)
router.get('/admin', async (req, res) => {
  try {
    const { status, position, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT * FROM applications 
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      queryStr += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (position) {
      queryStr += ` AND position_applied ILIKE $${paramIndex}`;
      queryParams.push(`%${position}%`);
      paramIndex++;
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await query(queryStr, queryParams);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM applications WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (position) {
      countQuery += ` AND position_applied ILIKE $${countIndex}`;
      countParams.push(`%${position}%`);
      countIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      applications: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications'
    });
  }
});

// Get single application (admin only)
router.get('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT * FROM applications WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      application: result.rows[0]
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application'
    });
  }
});

// Update application status (admin only)
router.put('/admin/:id', [
  body('status').isIn(['pending', 'reviewing', 'shortlisted', 'rejected', 'hired']).withMessage('Invalid status'),
  body('adminNotes').optional().isString().withMessage('Admin notes must be text')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const result = await query(`
      UPDATE applications 
      SET status = $1, admin_notes = $2
      WHERE id = $3
      RETURNING *
    `, [status, adminNotes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      application: result.rows[0]
    });

  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application'
    });
  }
});

// Delete application (admin only)
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get application info to delete resume file
    const appResult = await query('SELECT resume_filename FROM applications WHERE id = $1', [id]);
    
    if (appResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Delete application from database
    await query('DELETE FROM applications WHERE id = $1', [id]);

    // Delete resume file if exists
    if (appResult.rows[0].resume_filename) {
      const fs = require('fs');
      const resumePath = path.join('uploads/resumes/', appResult.rows[0].resume_filename);
      try {
        fs.unlinkSync(resumePath);
      } catch (fileError) {
        console.error('Failed to delete resume file:', fileError);
      }
    }

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application'
    });
  }
});

// Get application statistics (admin only)
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing,
        COUNT(CASE WHEN status = 'shortlisted' THEN 1 END) as shortlisted,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'hired' THEN 1 END) as hired,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days
      FROM applications
    `);

    const positionStats = await query(`
      SELECT position_applied, COUNT(*) as count
      FROM applications
      GROUP BY position_applied
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      positionStats: positionStats.rows
    });

  } catch (error) {
    console.error('Get application stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application statistics'
    });
  }
});

export default router;
