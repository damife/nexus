import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { loadEnvironmentConfig, validateEnvironment } from './environments.js';
import { validateConfiguration } from './validate-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load and validate environment configuration
loadEnvironmentConfig();
validateEnvironment();
validateConfiguration();

const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  console.log('🔍 DB_PASSWORD from process.env:', process.env.DB_PASSWORD ? `[${process.env.DB_PASSWORD.length} chars]` : 'NOT SET');
  console.log('🔍 DB_PASSWORD value:', process.env.DB_PASSWORD);
}

import pkg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pkg;

let dbPassword = process.env.DB_PASSWORD ? String(process.env.DB_PASSWORD).trim() : '';
if (dbPassword.startsWith('"') && dbPassword.endsWith('"')) {
  dbPassword = dbPassword.slice(1, -1);
}
if (dbPassword.startsWith("'") && dbPassword.endsWith("'")) {
  dbPassword = dbPassword.slice(1, -1);
}

if (isDevelopment) {
  console.log('🔍 Database connection config:', {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'swiftnexus',
    user: process.env.DB_USER || 'postgres',
    passwordSet: !!dbPassword,
    passwordLength: dbPassword ? dbPassword.length : 0,
    ssl: process.env.DB_SSL === 'true'
  });
}

if (!dbPassword && process.env.NODE_ENV !== 'test') {
  console.error('❌ ERROR: DB_PASSWORD is not set or empty!');
  console.error('Please check your .env file in the server directory.');
  throw new Error('Database password is required. Please set DB_PASSWORD in .env file.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'swiftnexus',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
  allowExitOnIdle: false, // Allow the pool to exit when idle
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Enhanced query function with error handling and logging
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (isDevelopment && duration > 1000) {
      console.log('Slow query detected', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
};

export const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'maker', 'checker')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'blocked', 'suspended')),
        bank_id INTEGER,
        can_download_fin BOOLEAN DEFAULT FALSE,
        balance DECIMAL(18, 8) DEFAULT 0.00000000,
        two_factor_secret VARCHAR(255),
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_method VARCHAR(20) CHECK (two_factor_method IN ('email', 'authenticator', NULL)),
        two_factor_required BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS banks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        bic VARCHAR(11) UNIQUE NOT NULL,
        address TEXT,
        country VARCHAR(100),
        customer_number VARCHAR(50),
        registration_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(100) UNIQUE NOT NULL,
        message_type VARCHAR(50) NOT NULL,
        category VARCHAR(10) NOT NULL,
        reference VARCHAR(100),
        sender_bic VARCHAR(11),
        receiver_bic VARCHAR(11),
        amount DECIMAL(18, 2),
        currency VARCHAR(3),
        value_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        form_data JSONB,
        swift_content TEXT,
        raw_swift_text TEXT,
        validation_errors JSONB,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id SERIAL PRIMARY KEY,
        queue_name VARCHAR(100) NOT NULL,
        message_id VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS demo_requests (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        job_title VARCHAR(255),
        phone VARCHAR(50),
        solution_interest VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='balance') THEN
          ALTER TABLE users ADD COLUMN balance DECIMAL(18, 8) DEFAULT 0.00000000;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='two_factor_enabled') THEN
          ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN two_factor_method VARCHAR(20) CHECK (two_factor_method IN ('email', 'authenticator', NULL));
          ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255);
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='email_verified') THEN
          ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
          ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
          ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='two_factor_required') THEN
          ALTER TABLE users ADD COLUMN two_factor_required BOOLEAN DEFAULT TRUE;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id SERIAL PRIMARY KEY,
        message_type VARCHAR(50) UNIQUE NOT NULL,
        amount DECIMAL(18, 8) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'fee_deduction')),
        amount DECIMAL(18, 8) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        transaction_id VARCHAR(255),
        message_id VARCHAR(100) REFERENCES messages(message_id) ON DELETE SET NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS nowpayments_settings (
        id SERIAL PRIMARY KEY,
        api_key VARCHAR(255) NOT NULL,
        ipn_secret VARCHAR(255),
        min_amount DECIMAL(18, 8) DEFAULT 0.00000001,
        max_amount DECIMAL(18, 8) DEFAULT 1000000.00,
        is_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS two_factor_auth (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        method VARCHAR(50) NOT NULL CHECK (method IN ('email', 'authenticator')),
        secret VARCHAR(255),
        email_code VARCHAR(6),
        expires_at TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string',
        category VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS outbound_messages (
        id SERIAL PRIMARY KEY,
        payment_id VARCHAR(100) NOT NULL,
        message_content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        ack_received BOOLEAN DEFAULT FALSE,
        ack_received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        cryptocurrency VARCHAR(20) NOT NULL,
        amount DECIMAL(18,8) DEFAULT 0,
        usd_value DECIMAL(18,2) DEFAULT 0,
        tx_hash VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        deposit_address VARCHAR(255),
        payment_id VARCHAR(255),
        pay_amount DECIMAL(18,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(18,8) NOT NULL,
        balance_before DECIMAL(18,8) NOT NULL,
        balance_after DECIMAL(18,8) NOT NULL,
        description TEXT,
        deposit_id INTEGER REFERENCES crypto_deposits(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crypto_deposits_user_id ON crypto_deposits(user_id);
      CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status ON crypto_deposits(status);
      CREATE INDEX IF NOT EXISTS idx_crypto_deposits_created_at ON crypto_deposits(created_at);
      CREATE INDEX IF NOT EXISTS idx_balance_history_user_id ON balance_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_balance_history_created_at ON balance_history(created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_history (
        id SERIAL PRIMARY KEY,
        message_type VARCHAR(50) NOT NULL,
        old_amount DECIMAL(18,8) NOT NULL,
        new_amount DECIMAL(18,8) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pricing_history_message_type ON pricing_history(message_type);
      CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON pricing_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_fees_message_type ON fees(message_type);
      CREATE INDEX IF NOT EXISTS idx_fees_currency ON fees(currency);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hardware_challenges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        challenge TEXT NOT NULL,
        challenge_id VARCHAR(255) UNIQUE NOT NULL,
        token_type VARCHAR(50) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hardware_challenges_user_id ON hardware_challenges(user_id);
      CREATE INDEX IF NOT EXISTS idx_hardware_challenges_challenge_id ON hardware_challenges(challenge_id);
      CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_backup_codes_code ON backup_codes(code);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sanctions_screening (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id),
        party_type VARCHAR(20) NOT NULL,
        party_name VARCHAR(255) NOT NULL,
        country VARCHAR(10),
        risk_score INTEGER,
        matches JSONB,
        screening_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS aml_monitoring (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        transaction_id VARCHAR(100),
        risk_score INTEGER NOT NULL,
        alerts JSONB,
        monitoring_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
        id SERIAL PRIMARY KEY,
        sar_number VARCHAR(20) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id),
        risk_score INTEGER NOT NULL,
        alerts JSONB,
        transaction_data JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        filed_at TIMESTAMP,
        reviewed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gpi_tracking (
        utr VARCHAR(50) PRIMARY KEY,
        tracking_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        data JSONB,
        status VARCHAR(20) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'pending',
        admin_notes TEXT,
        resolution TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='users' AND column_name='parent_user_id') THEN
          ALTER TABLE users ADD COLUMN parent_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
          ALTER TABLE users ADD COLUMN permissions JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_gpi_tracking_utr ON gpi_tracking(utr);
      CREATE INDEX IF NOT EXISTS idx_gpi_tracking_created_at ON gpi_tracking(created_at);
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_status ON admin_notifications(status);
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_complaints_user_id ON user_complaints(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_complaints_status ON user_complaints(status);
      CREATE INDEX IF NOT EXISTS idx_user_complaints_priority ON user_complaints(priority);
      CREATE INDEX IF NOT EXISTS idx_user_complaints_created_at ON user_complaints(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sanctions_screening_message_id ON sanctions_screening(message_id);
      CREATE INDEX IF NOT EXISTS idx_sanctions_screening_party_name ON sanctions_screening(party_name);
      CREATE INDEX IF NOT EXISTS idx_sanctions_screening_created_at ON sanctions_screening(created_at);
      CREATE INDEX IF NOT EXISTS idx_aml_monitoring_user_id ON aml_monitoring(user_id);
      CREATE INDEX IF NOT EXISTS idx_aml_monitoring_risk_score ON aml_monitoring(risk_score);
      CREATE INDEX IF NOT EXISTS idx_aml_monitoring_created_at ON aml_monitoring(created_at);
      CREATE INDEX IF NOT EXISTS idx_sars_user_id ON suspicious_activity_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_sars_status ON suspicious_activity_reports(status);
      CREATE INDEX IF NOT EXISTS idx_sars_created_at ON suspicious_activity_reports(created_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_outbound_payment_id ON outbound_messages(payment_id);
      CREATE INDEX IF NOT EXISTS idx_outbound_status ON outbound_messages(status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_sender_bic ON messages(sender_bic);
      CREATE INDEX IF NOT EXISTS idx_messages_receiver_bic ON messages(receiver_bic);
      CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
      CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
    `);

    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                      WHERE constraint_name='users_bank_id_fkey') THEN
          ALTER TABLE users ADD CONSTRAINT users_bank_id_fkey 
          FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_status_trail (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        status_label VARCHAR(100) NOT NULL,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_drafts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message_type VARCHAR(20) NOT NULL,
        sender_bic VARCHAR(11),
        receiver_bic VARCHAR(11),
        content TEXT,
        amount DECIMAL(15,2),
        currency VARCHAR(3) DEFAULT 'USD',
        priority VARCHAR(20) DEFAULT 'normal',
        text_block JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_whitelist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        ip_range VARCHAR(45) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, ip_address)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_access_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        access_granted BOOLEAN NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(32),
      ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS backup_codes TEXT;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS balance_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('add', 'deduct')),
        previous_balance DECIMAL(15,2) NOT NULL,
        new_balance DECIMAL(15,2) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_message_status_trail_message_id ON message_status_trail(message_id);
      CREATE INDEX IF NOT EXISTS idx_message_status_trail_status ON message_status_trail(status);
      CREATE INDEX IF NOT EXISTS idx_message_status_trail_created_at ON message_status_trail(created_at);
      CREATE INDEX IF NOT EXISTS idx_message_drafts_user_id ON message_drafts(user_id);
      CREATE INDEX IF NOT EXISTS idx_message_drafts_message_type ON message_drafts(message_type);
      CREATE INDEX IF NOT EXISTS idx_message_drafts_updated_at ON message_drafts(updated_at);
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_user_id ON ip_whitelist(user_id);
      CREATE INDEX IF NOT EXISTS idx_ip_whitelist_ip_address ON ip_whitelist(ip_address);
      CREATE INDEX IF NOT EXISTS idx_ip_access_logs_user_id ON ip_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_ip_access_logs_created_at ON ip_access_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_by ON balance_transactions(created_by);
    `);

    await pool.query(`
      INSERT INTO fees (message_type, amount, currency)
      VALUES ('MT103', 0.00001, 'USD')
      ON CONFLICT (message_type) DO NOTHING;
    `);
    await pool.query(`
      INSERT INTO fees (message_type, amount, currency)
      VALUES ('pacs.008', 0.000015, 'USD')
      ON CONFLICT (message_type) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description)
      VALUES 
        ('nowpayments_api_key', '', 'string', 'payment', 'NowPayments API Key'),
        ('nowpayments_ipn_secret', '', 'string', 'payment', 'NowPayments IPN Secret'),
        ('resend_api_key', '', 'string', 'email', 'Resend API Key'),
        ('resend_from_email', 'noreply@swiftnexus.com', 'string', 'email', 'Resend From Email Address'),
        ('system_name', 'SwiftNexus Enterprise', 'string', 'general', 'System Name'),
        ('minimum_balance', '10.0', 'number', 'payment', 'Minimum Balance Required')
      ON CONFLICT (setting_key) DO NOTHING
    `);

    console.log('✅ Database initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

export default pool;
