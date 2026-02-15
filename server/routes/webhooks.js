import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../config/database.js';
import logger from '../config/logger.js';
import axios from 'axios';

const router = express.Router();

router.post('/register', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { url, events, secret } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'URL and events array are required'
      });
    }

    const result = await query(
      `INSERT INTO webhooks (url, events, secret, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [url, JSON.stringify(events), secret || null, req.user.id]
    );

    res.json({
      success: true,
      webhook: result.rows[0]
    });
  } catch (error) {
    logger.error('Webhook registration error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to register webhook'
    });
  }
});

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM webhooks ORDER BY created_at DESC');
    res.json({
      success: true,
      webhooks: result.rows
    });
  } catch (error) {
    logger.error('Webhook list error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve webhooks'
    });
  }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await query('DELETE FROM webhooks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    logger.error('Webhook deletion error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook'
    });
  }
});

export const triggerWebhook = async (event, data) => {
  try {
    const result = await query(
      'SELECT * FROM webhooks WHERE $1 = ANY(events::text[]) AND active = true',
      [event]
    );

    for (const webhook of result.rows) {
      try {
        await axios.post(webhook.url, {
          event,
          data,
          timestamp: new Date().toISOString(),
          signature: webhook.secret ? generateSignature(data, webhook.secret) : null
        }, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SwiftNexus-Webhook/1.0'
          }
        });
        logger.info('Webhook triggered', { webhookId: webhook.id, event });
      } catch (error) {
        logger.error('Webhook delivery error', {
          webhookId: webhook.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    logger.error('Webhook trigger error', { error: error.message });
  }
};

const generateSignature = (data, secret) => {
  const crypto = require('crypto');
  const payload = JSON.stringify(data);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

export default router;

