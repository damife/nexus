-- Fix JSONB column values properly
UPDATE system_settings SET value = '"KVAZXQH-9YCM35R-QYPN2W9-75M9ZPD"'::jsonb WHERE key = 'nowpayments_api_key';
UPDATE system_settings SET value = '"gXKuLNIqNpblGzcPaAL0xTjA2Cnre92U"'::jsonb WHERE key = 'nowpayments_ipn_secret';
UPDATE system_settings SET value = '"4f3ee86d-48d6-44e2-ba96-7bbbf34ec44c"'::jsonb WHERE key = 'nowpayments_api_secret';
UPDATE system_settings SET value = '"USD"'::jsonb WHERE key = 'default_currency';

-- Show raw values with jsonb length
SELECT key, value, jsonb_typeof(value) as type, length(value::text) as char_length FROM system_settings WHERE key LIKE 'nowpayments_%' OR key = 'default_currency' ORDER BY key;
