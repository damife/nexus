// Debug script to test NowPayments configuration loading
import { query } from './server/config/database.js';

async function debugNowPayments() {
  try {
    console.log('🔍 Debugging NowPayments configuration...');
    
    const result = await query(
      'SELECT key, value FROM system_settings WHERE key IN ($1, $2, $3, $4, $5)',
      ['nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_payout_wallet', 'nowpayments_payout_currency', 'default_currency']
    );

    console.log('📋 Raw database results:');
    result.rows.forEach(row => {
      console.log(`Key: ${row.key}`);
      console.log(`Value: [${row.value}]`);
      console.log(`Value type: ${typeof row.value}`);
      console.log(`Value length: ${row.value.length}`);
      
      // Try to parse
      try {
        const parsed = JSON.parse(row.value);
        console.log(`✅ Parsed: ${parsed}`);
        console.log(`Parsed type: ${typeof parsed}`);
      } catch (parseError) {
        console.log(`❌ Parse error: ${parseError.message}`);
        console.log(`First 10 chars: [${row.value.substring(0, 10)}]`);
        console.log(`Char codes: ${Array.from(row.value.substring(0, 10)).map(c => c.charCodeAt(0))}`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('Database error:', error);
  }
}

debugNowPayments();
