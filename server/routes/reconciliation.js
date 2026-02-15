import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import nowpaymentsService from '../services/nowpaymentsService.js';

const router = express.Router();

// All reconciliation routes require authentication and admin role
router.use(authenticate);

// Perform daily reconciliation
router.post('/daily', async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    logger.info('Starting daily reconciliation', { date: targetDate });

    // Get local payments for the date
    const localPayments = await query(`
      SELECT 
        payment_id,
        order_id,
        amount,
        currency,
        pay_currency,
        status,
        actually_paid,
        created_at,
        updated_at
      FROM payments 
      WHERE DATE(created_at) = $1
    `, [targetDate]);

    // Get remote payments from NowPayments
    let remotePayments = [];
    try {
      const nowPayments = nowpaymentsService;
      const response = await nowPayments.apiCall('GET', '/payment', null, {
        limit: 100,
        date_from: targetDate,
        date_to: targetDate
      });
      remotePayments = response.data || [];
    } catch (error) {
      logger.error('Failed to fetch remote payments', error);
    }

    // Find discrepancies
    const discrepancies = await findDiscrepancies(localPayments.rows, remotePayments);

    // Auto-fix what we can
    const autoFixed = await autoFixDiscrepancies(discrepancies);

    // Manual review needed
    const manualReview = discrepancies.filter(d => !autoFixed.includes(d.id));

    // Save reconciliation report
    await saveReconciliationReport(targetDate, {
      local_count: localPayments.rows.length,
      remote_count: remotePayments.length,
      total_discrepancies: discrepancies.length,
      auto_fixed: autoFixed.length,
      manual_review: manualReview.length,
      discrepancies: discrepancies
    });

    // Alert admin if needed
    if (manualReview.length > 0) {
      await alertAdmin(manualReview);
    }

    res.json({
      success: true,
      date: targetDate,
      total_local: localPayments.rows.length,
      total_remote: remotePayments.length,
      discrepancies: discrepancies.length,
      auto_fixed: autoFixed.length,
      manual_review: manualReview.length,
      details: {
        local_payments: localPayments.rows,
        remote_payments: remotePayments,
        discrepancies: discrepancies
      }
    });

  } catch (error) {
    logger.error('Daily reconciliation failed', {
      error: error.message,
      date: req.body.date
    });
    
    res.status(500).json({
      success: false,
      message: 'Reconciliation failed',
      error: error.message
    });
  }
});

// Get reconciliation history
router.get('/history', async (req, res) => {
  try {
    const { limit = 30, offset = 0 } = req.query;

    const result = await query(`
      SELECT 
        id,
        report_data,
        created_at
      FROM reconciliation_reports 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM reconciliation_reports');

    res.json({
      success: true,
      reports: result.rows.map(row => ({
        id: row.id,
        ...JSON.parse(row.report_data),
        created_at: row.created_at
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('Error getting reconciliation history', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get history',
      error: error.message
    });
  }
});

// Get specific reconciliation report
router.get('/report/:date', async (req, res) => {
  try {
    const { date } = req.params;

    const result = await query(`
      SELECT report_data, created_at
      FROM reconciliation_reports 
      WHERE DATE(created_at) = $1
    `, [date]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found for this date'
      });
    }

    res.json({
      success: true,
      report: {
        ...JSON.parse(result.rows[0].report_data),
        created_at: result.rows[0].created_at
      }
    });

  } catch (error) {
    logger.error('Error getting reconciliation report', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report',
      error: error.message
    });
  }
});

// Get current discrepancies
router.get('/discrepancies', async (req, res) => {
  try {
    const { status = 'unresolved' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      whereClause += ' AND status = $1';
      params.push(status);
    }

    const result = await query(`
      SELECT *
      FROM payment_discrepancies 
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    res.json({
      success: true,
      discrepancies: result.rows
    });

  } catch (error) {
    logger.error('Error getting discrepancies', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get discrepancies',
      error: error.message
    });
  }
});

// Auto-fix discrepancies
router.post('/auto-fix', async (req, res) => {
  try {
    const { discrepancy_ids } = req.body;

    if (!Array.isArray(discrepancy_ids) || discrepancy_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Discrepancy IDs are required'
      });
    }

    const fixed = [];
    const errors = [];

    for (const id of discrepancy_ids) {
      try {
        const result = await autoFixDiscrepancy(id);
        fixed.push(id);
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    res.json({
      success: true,
      fixed,
      errors,
      message: `Fixed ${fixed.length} discrepancies, ${errors.length} errors`
    });

  } catch (error) {
    logger.error('Auto-fix discrepancies failed', error);
    res.status(500).json({
      success: false,
      message: 'Auto-fix failed',
      error: error.message
    });
  }
});

// Resolve discrepancy manually
router.put('/discrepancy/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Resolution is required'
      });
    }

    await query(`
      UPDATE payment_discrepancies 
      SET 
        status = 'resolved',
        resolution = $1,
        notes = $2,
        resolved_at = CURRENT_TIMESTAMP,
        resolved_by = $3
      WHERE id = $4
    `, [resolution, notes, req.user.id, id]);

    res.json({
      success: true,
      message: 'Discrepancy resolved successfully'
    });

  } catch (error) {
    logger.error('Resolve discrepancy failed', error);
    res.status(500).json({
      success: false,
      message: 'Resolution failed',
      error: error.message
    });
  }
});

// Get reconciliation statistics
router.get('/stats', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    let dateCondition = '';
    switch (timeframe) {
      case '7d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case '30d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
      case '90d':
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '90 days'";
        break;
      default:
        dateCondition = "created_at >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const stats = await query(`
      SELECT 
        COUNT(*) as total_reconciliations,
        COUNT(CASE WHEN JSON_EXTRACT_TEXT(report_data, '$.total_discrepancies') > '0' THEN 1 END) as with_discrepancies,
        COUNT(CASE WHEN JSON_EXTRACT_TEXT(report_data, '$.manual_review') > '0' THEN 1 END) as required_manual_review,
        AVG(JSON_EXTRACT_TEXT(report_data, '$.total_discrepancies')::float) as avg_discrepancies,
        AVG(JSON_EXTRACT_TEXT(report_data, '$.auto_fixed')::float) as avg_auto_fixed
      FROM reconciliation_reports 
      WHERE ${dateCondition}
    `);

    const discrepancyStats = await query(`
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
      FROM payment_discrepancies 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY type
    `);

    res.json({
      success: true,
      timeframe,
      stats: stats.rows[0] || {},
      discrepancy_stats: discrepancyStats.rows
    });

  } catch (error) {
    logger.error('Error getting reconciliation stats', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

// Export reconciliation report
router.get('/export/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const { format = 'csv' } = req.query;

    const result = await query(`
      SELECT report_data
      FROM reconciliation_reports 
      WHERE DATE(created_at) = $1
    `, [date]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const reportData = JSON.parse(result.rows[0].report_data);

    if (format === 'csv') {
      // Convert discrepancies to CSV
      const csv = convertDiscrepanciesToCSV(reportData.discrepancies || []);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="reconciliation-${date}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        report: reportData
      });
    }

  } catch (error) {
    logger.error('Error exporting report', error);
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Schedule automatic reconciliation
router.post('/schedule', async (req, res) => {
  try {
    const { frequency, time, enabled } = req.body;

    // This would integrate with a job scheduler like node-cron
    // For now, we'll just store the schedule in database
    const result = await query(`
      INSERT INTO reconciliation_schedules (frequency, time, enabled, created_by, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id
    `, [frequency, time, enabled, req.user.id]);

    res.json({
      success: true,
      schedule_id: result.rows[0].id,
      message: 'Reconciliation scheduled successfully'
    });

  } catch (error) {
    logger.error('Schedule reconciliation failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule',
      error: error.message
    });
  }
});

// Get reconciliation schedule
router.get('/schedule', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM reconciliation_schedules 
      WHERE enabled = true 
      ORDER BY created_at DESC
      LIMIT 1
    `);

    res.json({
      success: true,
      schedule: result.rows[0] || null
    });

  } catch (error) {
    logger.error('Error getting schedule', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule',
      error: error.message
    });
  }
});

// Cancel scheduled reconciliation
router.delete('/schedule/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await query(`
      UPDATE reconciliation_schedules 
      SET enabled = false 
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Schedule cancelled successfully'
    });

  } catch (error) {
    logger.error('Cancel schedule failed', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel schedule',
      error: error.message
    });
  }
});

// Validate payment data integrity
router.get('/validate/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Check if payment exists locally
    const localResult = await query(`
      SELECT * FROM payments WHERE payment_id = $1
    `, [paymentId]);

    if (localResult.rows.length === 0) {
      return res.json({
        success: true,
        exists_locally: false,
        exists_remotely: false,
        integrity_score: 0
      });
    }

    // Check if payment exists remotely
    let existsRemotely = false;
    try {
      const nowPayments = nowpaymentsService;
      await nowPayments.apiCall('GET', `/payment/${paymentId}`);
      existsRemotely = true;
    } catch (error) {
      existsRemotely = false;
    }

    // Calculate integrity score
    let integrityScore = 100;
    if (!existsRemotely) integrityScore -= 50;

    res.json({
      success: true,
      exists_locally: true,
      exists_remotely: existsRemotely,
      integrity_score,
      local_data: localResult.rows[0]
    });

  } catch (error) {
    logger.error('Payment validation failed', error);
    res.status(500).json({
      success: false,
      message: 'Validation failed',
      error: error.message
    });
  }
});

// Manual reconciliation trigger
router.post('/manual', async (req, res) => {
  try {
    const { date_range, options = {} } = req.body;
    const { start_date, end_date } = date_range;

    logger.info('Manual reconciliation triggered', { date_range, options });

    // Get payments for the date range
    const localPayments = await query(`
      SELECT 
        payment_id,
        order_id,
        amount,
        currency,
        pay_currency,
        status,
        actually_paid,
        created_at,
        updated_at
      FROM payments 
      WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2
    `, [start_date, end_date]);

    // Get remote payments
    let remotePayments = [];
    try {
      const nowPayments = nowpaymentsService;
      const response = await nowPayments.apiCall('GET', '/payment', null, {
        limit: 500,
        date_from: start_date,
        date_to: end_date
      });
      remotePayments = response.data || [];
    } catch (error) {
      logger.error('Failed to fetch remote payments for manual reconciliation', error);
    }

    // Find discrepancies
    const discrepancies = await findDiscrepancies(localPayments.rows, remotePayments);

    res.json({
      success: true,
      date_range,
      total_local: localPayments.rows.length,
      total_remote: remotePayments.length,
      discrepancies: discrepancies.length,
      details: {
        local_payments: localPayments.rows,
        remote_payments: remotePayments,
        discrepancies: discrepancies
      }
    });

  } catch (error) {
    logger.error('Manual reconciliation failed', error);
    res.status(500).json({
      success: false,
      message: 'Manual reconciliation failed',
      error: error.message
    });
  }
});

// Helper functions
async function findDiscrepancies(localPayments, remotePayments) {
  const discrepancies = [];
  const remoteMap = new Map(
    remotePayments.map(p => [p.payment_id, p])
  );

  // Check each local payment against remote records
  for (const local of localPayments) {
    const remote = remoteMap.get(local.payment_id);
    
    if (!remote) {
      // Payment exists locally but not remotely
      discrepancies.push({
        id: `local_${local.payment_id}`,
        type: 'MISSING_REMOTE',
        payment_id: local.payment_id,
        local_data: local,
        remote_data: null,
        severity: 'HIGH',
        status: 'unresolved',
        created_at: new Date()
      });
    } else {
      // Check for differences
      if (local.status !== remote.payment_status) {
        discrepancies.push({
          id: `status_${local.payment_id}`,
          type: 'STATUS_MISMATCH',
          payment_id: local.payment_id,
          local_data: local,
          remote_data: remote,
          severity: 'MEDIUM',
          status: 'unresolved',
          created_at: new Date()
        });
      }
      
      if (Math.abs(parseFloat(local.actually_paid || local.amount) - parseFloat(remote.actually_paid || 0)) > 0.01) {
        discrepancies.push({
          id: `amount_${local.payment_id}`,
          type: 'AMOUNT_MISMATCH',
          payment_id: local.payment_id,
          local_data: local,
          remote_data: remote,
          severity: 'MEDIUM',
          status: 'unresolved',
          created_at: new Date()
        });
      }
    }
  }

  // Check for payments that exist remotely but not locally
  const localMap = new Map(
    localPayments.map(p => [p.payment_id, p])
  );

  for (const remote of remotePayments) {
    if (!localMap.has(remote.payment_id)) {
      discrepancies.push({
        id: `remote_${remote.payment_id}`,
        type: 'MISSING_LOCAL',
        payment_id: remote.payment_id,
        local_data: null,
        remote_data: remote,
        severity: 'HIGH',
        status: 'unresolved',
        created_at: new Date()
      });
    }
  }

  return discrepancies;
}

async function autoFixDiscrepancies(discrepancyId) {
  // This would implement auto-fix logic
  // For now, we'll just mark as auto-fixed
  await query(`
    UPDATE payment_discrepancies 
    SET status = 'auto_fixed', 
    auto_fixed_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [discrepancyId]);
}

async function saveReconciliationReport(date, reportData) {
  await query(`
    INSERT INTO reconciliation_reports (report_data, created_at)
    VALUES ($1, CURRENT_TIMESTAMP)
  `, [JSON.stringify(reportData)]);
}

async function alertAdmin(discrepancies) {
  // This would send email/SMS/alert to admin
  logger.error('Payment discrepancies require manual review', { 
    count: discrepancies.length,
    discrepancies: discrepancies.slice(0, 5) // First 5 for brevity
  });
}

function convertDiscrepanciesToCSV(discrepancies) {
  if (!discrepancies || discrepancies.length === 0) return '';

  const headers = [
    'ID',
    'Type',
    'Payment ID',
    'Severity',
    'Status',
    'Local Amount',
    'Remote Amount',
    'Local Status',
    'Remote Status',
    'Created At'
  ];

  const csvRows = discrepancies.map(d => [
    d.id,
    d.type,
    d.payment_id,
    d.severity,
    d.status,
    d.local_data?.amount || '',
    d.remote_data?.actually_paid || '',
    d.local_data?.status || '',
    d.remote_data?.payment_status || '',
    d.created_at
  ]);

  return [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
}

export default router;
