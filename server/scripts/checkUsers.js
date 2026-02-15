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

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const result = await pool.query(`
      SELECT id, username, email, name, role, balance
      FROM users
      ORDER BY id
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Found ${result.rows.length} users:`);
      result.rows.forEach(user => {
        console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}, Balance: $${user.balance}`);
      });
    } else {
      console.log('❌ No users found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check users:', error.message);
    process.exit(1);
  }
}

checkUsers();
