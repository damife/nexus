import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Database Installer Script
 * Automatically creates database and all tables
 */
async function installDatabase() {
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres' // Connect to default database first
  });

  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    await adminPool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const dbName = process.env.DB_NAME || 'swiftnexus';
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}...`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created`);
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }

    await adminPool.end();

    // Now connect to the actual database
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: dbName
    });

    console.log('📋 Creating tables...');

    // Import and run database initialization
    const { initDatabase } = await import('../config/database.js');
    await initDatabase();

    console.log('✅ Database installation complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Access the application at http://localhost:3000/app.html');
    console.log('3. Login with default credentials:');
    console.log('   - Admin: admin@swiftnexus.com / admin123');
    console.log('   - User: user@swiftnexus.com / user123');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database installation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

installDatabase();

