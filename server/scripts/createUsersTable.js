import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

async function createUsersTable() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'swiftnexus'
  });

  try {
    console.log('🔍 Creating users table...');
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if admin user exists
    const adminResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@swiftnexus.com']
    );

    if (adminResult.rows.length === 0) {
      // Create admin user
      const adminPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await pool.query(`
        INSERT INTO users (username, email, password, name, role, status, email_verified, two_factor_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['admin', 'admin@swiftnexus.com', hashedPassword, 'System Administrator', 'admin', 'active', true, false]);

      console.log('✅ Admin user created successfully!');
    } else {
      console.log('✅ Admin user already exists');
    }

    console.log('✅ Users table setup complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

createUsersTable();
