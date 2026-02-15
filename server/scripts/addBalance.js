import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'swiftnexus'
});

async function addBalance() {
  try {
    console.log('🔍 Adding balance to admin user...');
    
    // Add balance to admin user (id=1)
    const result = await pool.query(`
      UPDATE users 
      SET balance = 10000.00, updated_at = NOW()
      WHERE id = 1
      RETURNING id, name, email, balance
    `);

    if (result.rows.length > 0) {
      console.log('✅ Balance added successfully:');
      console.log(`   - User: ${result.rows[0].name} (${result.rows[0].email})`);
      console.log(`   - New Balance: $${result.rows[0].balance}`);
    } else {
      console.log('❌ Admin user not found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add balance:', error.message);
    process.exit(1);
  }
}

addBalance();
