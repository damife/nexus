import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    // Check for installation lock file first
    const fs = await import('fs');
    const path = await import('path');
    const lockFile = path.join(__dirname, '../../installer/.installer');
    
    if (fs.existsSync(lockFile)) {
      try {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
        return res.json({
          installed: true,
          lockData: lockData,
          source: 'lockfile'
        });
      } catch (error) {
        console.error('Error reading lock file:', error);
      }
    }
    
    // Fallback to database check
    const result = await query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    const tableCount = parseInt(result.rows[0].count);

    res.json({
      installed: tableCount > 0,
      tableCount: tableCount,
      source: 'database'
    });
  } catch (error) {
    res.json({
      installed: false,
      error: error.message,
      source: 'error'
    });
  }
});

router.post('/test-connection', async (req, res) => {
  try {
    const { host, port, database, user, password } = req.body;

    if (!host || !port || !database || !user || !password) {
      return res.status(400).json({
        success: false,
        message: 'All database fields are required'
      });
    }

    const testPool = new Pool({
      host,
      port: parseInt(port),
      database,
      user,
      password
    });

    await testPool.query('SELECT 1');
    await testPool.end();

    res.json({
      success: true,
      message: 'Database connection successful'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/create-database', async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body;

    if (!host || !port || !user || !password || !database) {
      return res.status(400).json({
        success: false,
        message: 'All database fields are required'
      });
    }

    const adminPool = new Pool({
      host,
      port: parseInt(port),
      database: 'postgres',
      user,
      password
    });

    const dbCheck = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database]
    );

    if (dbCheck.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${database}`);
      await adminPool.end();

      res.json({
        success: true,
        message: 'Database created successfully'
      });
    } else {
      await adminPool.end();
      res.json({
        success: true,
        message: 'Database already exists'
      });
    }
  } catch (error) {
    logger.error('Create database error', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/test-smtp', async (req, res) => {
  try {
    const { host, port, user, password, secure, fromEmail, fromName } = req.body;

    if (!host) {
      return res.json({
        success: true,
        message: 'SMTP configuration skipped (optional)'
      });
    }

    if (!user || !password) {
      return res.status(400).json({
        success: false,
        message: 'SMTP username and password are required when host is provided'
      });
    }

    const nodemailer = (await import('nodemailer')).default;
    
    const transporter = nodemailer.createTransporter({
      host,
      port: parseInt(port) || 587,
      secure: secure || false,
      auth: {
        user,
        pass: password
      }
    });

    await transporter.verify();
    await transporter.close();

    res.json({
      success: true,
      message: 'SMTP connection successful'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/install', async (req, res) => {
  try {
    const { 
      dbConfig, 
      adminConfig, 
      smtpConfig, 
      paymentConfig 
    } = req.body;

    const { host, port, database, user, password } = dbConfig;

    if (!host || !port || !database || !user || !password) {
      return res.status(400).json({
        success: false,
        message: 'All database fields are required'
      });
    }

    const installPool = new Pool({
      host,
      port: parseInt(port),
      database,
      user,
      password
    });

    const { initDatabase } = await import('../config/database.js');
    
    const originalPool = global.pool;
    global.pool = installPool;
    
    await initDatabase();

    if (adminConfig.email && adminConfig.password && adminConfig.name) {
      const bcrypt = (await import('bcryptjs')).default;
      const hashedPassword = await bcrypt.hash(adminConfig.password, 10);

      await installPool.query(`
        INSERT INTO users (name, email, password, role, status, email_verified, two_factor_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [adminConfig.name, adminConfig.email, hashedPassword, 'admin', 'active', true, false]);
    }

    // Save SMTP configuration
    if (smtpConfig && smtpConfig.host) {
      await installPool.query(`
        INSERT INTO system_settings (key, value, description, is_public)
        VALUES 
          ('smtp_host', $1, 'SMTP server host', false),
          ('smtp_port', $2, 'SMTP server port', false),
          ('smtp_secure', $3, 'Use SSL/TLS for SMTP', false),
          ('smtp_user', $4, 'SMTP username', false),
          ('smtp_password', $5, 'SMTP password', false),
          ('smtp_from_email', $6, 'From email address', true),
          ('smtp_from_name', $7, 'From display name', true)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `, [
        JSON.stringify(smtpConfig.host),
        JSON.stringify(smtpConfig.port || ''),
        JSON.stringify(smtpConfig.secure || false),
        JSON.stringify(smtpConfig.user || ''),
        JSON.stringify(smtpConfig.password || ''),
        JSON.stringify(smtpConfig.fromEmail || ''),
        JSON.stringify(smtpConfig.fromName || '')
      ]);
    }

    // Save payment configuration
    if (paymentConfig) {
      await installPool.query(`
        INSERT INTO system_settings (key, value, description, is_public)
        VALUES 
          ('nowpayments_enabled', $1, 'Enable NowPayments crypto payments', false),
          ('nowpayments_api_key', $2, 'NowPayments API key', false),
          ('nowpayments_ipn_secret', $3, 'NowPayments IPN secret key', false),
          ('nowpayments_payout_wallet', $4, 'Payout wallet address', false),
          ('nowpayments_payout_currency', $5, 'Payout wallet currency', false),
          ('default_currency', $6, 'Default currency', true),
          ('default_price', $7, 'Default subscription price', true)
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = CURRENT_TIMESTAMP
      `, [
        JSON.stringify(paymentConfig.nowpaymentsEnabled || false),
        JSON.stringify(paymentConfig.nowpaymentsApiKey || ''),
        JSON.stringify(paymentConfig.nowpaymentsIpnSecret || ''),
        JSON.stringify(paymentConfig.payoutWalletAddress || ''),
        JSON.stringify(paymentConfig.payoutWalletCurrency || ''),
        JSON.stringify(paymentConfig.defaultCurrency || ''),
        JSON.stringify(paymentConfig.defaultPrice || '')
      ]);
    }

    // Install database schemas
    logger.info('Installing database schemas...');
    
    // Install main database schema
    const databaseSchemaPath = path.join(__dirname, '../../database/database.sql');
    if (fs.existsSync(databaseSchemaPath)) {
      const databaseSchema = fs.readFileSync(databaseSchemaPath, 'utf8');
      await installPool.query(databaseSchema);
      logger.info('Main database schema installed successfully');
    } else {
      logger.warn('Main database schema file not found, skipping...');
    }

    // Install message system schema
    const messageSchemaPath = path.join(__dirname, '../../database/message.sql');
    if (fs.existsSync(messageSchemaPath)) {
      const messageSchema = fs.readFileSync(messageSchemaPath, 'utf8');
      await installPool.query(messageSchema);
      logger.info('Message system schema installed successfully');
    } else {
      logger.warn('Message system schema file not found, skipping...');
    }

    // Install payment schema
    const paymentSchemaPath = path.join(__dirname, '../../database/payment.sql');
    if (fs.existsSync(paymentSchemaPath)) {
      const paymentSchema = fs.readFileSync(paymentSchemaPath, 'utf8');
      await installPool.query(paymentSchema);
      logger.info('Payment schema installed successfully');
    } else {
      logger.warn('Payment schema file not found, skipping...');
    }

    // Install requests schema
    const requestsSchemaPath = path.join(__dirname, '../../database/requests.sql');
    if (fs.existsSync(requestsSchemaPath)) {
      const requestsSchema = fs.readFileSync(requestsSchemaPath, 'utf8');
      await installPool.query(requestsSchema);
      logger.info('Requests schema installed successfully');
    } else {
      logger.warn('Requests schema file not found, skipping...');
    }

    // Install analytics schema
    const analyticsSchemaPath = path.join(__dirname, '../../database/analytics.sql');
    if (fs.existsSync(analyticsSchemaPath)) {
      const analyticsSchema = fs.readFileSync(analyticsSchemaPath, 'utf8');
      await installPool.query(analyticsSchema);
      logger.info('Analytics schema installed successfully');
    } else {
      logger.warn('Analytics schema file not found, skipping...');
    }

    // Install applications schema
    const applicationsSchemaPath = path.join(__dirname, '../../database/migrations/applications.sql');
    if (fs.existsSync(applicationsSchemaPath)) {
      const applicationsSchema = fs.readFileSync(applicationsSchemaPath, 'utf8');
      await installPool.query(applicationsSchema);
      logger.info('Applications schema installed successfully');
    } else {
      logger.warn('Applications schema file not found, skipping...');
    }

    // Create installation lock file
    const installerDir = path.join(__dirname, '../../installer');
    if (!fs.existsSync(installerDir)) {
      fs.mkdirSync(installerDir, { recursive: true });
    }
    
    const lockFile = path.join(installerDir, '.installer');
    const lockData = {
      installed: true,
      installedAt: new Date().toISOString(),
      version: '1.0.0',
      adminEmail: adminConfig.email
    };
    
    fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2), 'utf8');
    logger.info('Installation lock file created', { path: lockFile });

    const { randomBytes } = await import('crypto');
    const envPath = path.join(__dirname, '../../.env');
    const jwtSecret = randomBytes(64).toString('hex');
    
    const envContent = `DB_HOST=${host}
DB_PORT=${port}
DB_NAME=${database}
DB_USER=${user}
DB_PASSWORD=${password}
JWT_SECRET=${jwtSecret}
PORT=5000
NODE_ENV=production
CORS_ORIGIN=${process.env.CORS_ORIGIN || 'http://localhost:3000'}
RABBITMQ_URL=${process.env.RABBITMQ_URL || 'amqp://localhost:5672'}
LOG_LEVEL=info
APP_URL=${process.env.APP_URL || 'http://localhost:3000'}
`;

    fs.writeFileSync(envPath, envContent, 'utf8');
    logger.info('Environment file created', { path: envPath });

    await installPool.end();
    global.pool = originalPool;

    res.json({
      success: true,
      message: 'SwiftNexus Enterprise installed successfully with all configurations'
    });
  } catch (error) {
    logger.error('Install error', { error: error.message });
    res.status(500).json({
      success: false,
      message: error.message,
      errors: error.stack ? [error.stack] : []
    });
  }
});

export default router;
