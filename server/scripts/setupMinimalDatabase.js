import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Minimal Database Setup - Creates only essential tables
 */
async function setupMinimalDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'swiftnexus'
  });

  try {
    console.log('🔍 Setting up minimal database...');
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');

    // Drop existing tables to avoid conflicts
    await pool.query(`DROP TABLE IF EXISTS balance_transactions CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS payments CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS messages CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS users CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS banks CASCADE`);
    
    // Create banks table first (no dependencies)
    await pool.query(`
      CREATE TABLE banks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        bic VARCHAR(11) UNIQUE NOT NULL,
        country VARCHAR(100),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table (references banks)
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        status VARCHAR(20) DEFAULT 'active',
        email_verified BOOLEAN DEFAULT false,
        two_factor_required BOOLEAN DEFAULT false,
        parent_user_id INTEGER REFERENCES users(id),
        bank_id INTEGER REFERENCES banks(id),
        balance DECIMAL(20,8) DEFAULT 0.00000000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create messages table (references users)
    await pool.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        message_type VARCHAR(20) NOT NULL,
        sender_bic VARCHAR(11) NOT NULL,
        receiver_bic VARCHAR(11) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'pending',
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(20,8),
        currency VARCHAR(3),
        utr VARCHAR(50) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
    await pool.query(`
      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        recipient_bic VARCHAR(11) NOT NULL,
        recipient_account VARCHAR(50) NOT NULL,
        amount DECIMAL(20,8) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        reference TEXT,
        transaction_ref VARCHAR(50) UNIQUE NOT NULL,
        payment_type VARCHAR(20) DEFAULT 'SWIFT',
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settled_at TIMESTAMP
      )
    `);

    // Create balance_transactions table
    await pool.query(`
      CREATE TABLE balance_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(20,8) NOT NULL,
        type VARCHAR(20) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admin user if not exists
    const adminEmail = 'admin@swiftnexus.com';
    const adminPassword = 'admin123'; // Default from installer
    
    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await pool.query(`
      INSERT INTO users (username, email, password, name, role, status, email_verified, two_factor_required)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING
    `, ['admin', adminEmail, hashedPassword, 'System Administrator', 'admin', 'active', true, false]);

    // Add sample bank for testing
    await pool.query(`
      INSERT INTO banks (name, bic, country, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (bic) DO NOTHING
    `, ['Test Bank', 'TESTBICXXX', 'US', 'active']);

    console.log('✅ Minimal database setup complete!');
    console.log('📝 Default admin credentials:');
    console.log('   - Email: admin@swiftnexus.com');
    console.log('   - Password: admin123');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

setupMinimalDatabase();
