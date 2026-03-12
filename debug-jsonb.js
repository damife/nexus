// Debug JSONB issue specifically
import { query } from './server/config/database.js';

async function debugJSONB() {
  try {
    console.log('🔍 Debugging JSONB NowPayments...');
    
    const result = await query(
      'SELECT key, value, pg_typeof(value) as pg_type FROM system_settings WHERE key IN ($1, $2, $3, $4, $5)',
      ['nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_payout_wallet', 'nowpayments_payout_currency', 'default_currency']
    );

    console.log('📋 Raw database results with PostgreSQL types:');
    result.rows.forEach(row => {
      console.log(`Key: ${row.key}`);
      console.log(`Value: ${JSON.stringify(row.value)}`);
      console.log(`PostgreSQL type: ${row.pg_type}`);
      console.log(`JavaScript type: ${typeof row.value}`);
      console.log(`Is string: ${typeof row.value === 'string'}`);
      console.log(`Value content: [${row.value}]`);
      
      // Test parsing
      try {
        if (typeof row.value === 'string') {
          console.log('✅ Already string, using directly');
          const parsed = JSON.parse(row.value);
          console.log(`✅ Parsed result: ${parsed}`);
        } else {
          console.log('🔄 Converting to string first');
          const strValue = JSON.stringify(row.value);
          console.log(`Stringified: ${strValue}`);
          const parsed = JSON.parse(strValue);
          console.log(`✅ Parsed result: ${parsed}`);
        }
      } catch (parseError) {
        console.log(`❌ Parse failed: ${parseError.message}`);
      }
      console.log('---');
    });

  } catch (error) {
    console.error('Database error:', error);
  }
}

debugJSONB();
