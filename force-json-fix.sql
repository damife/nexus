-- Force update with escaped quotes - PostgreSQL specific
UPDATE system_settings SET value = '"KVAZXQH-9YCM35R-QYPN2W9-75M9ZPD"'::text WHERE key = 'nowpayments_api_key';
UPDATE system_settings SET value = '"gXKuLNIqNpblGzcPaAL0xTjA2Cnre92U"'::text WHERE key = 'nowpayments_ipn_secret';
UPDATE system_settings SET value = '"4f3ee86d-48d6-44e2-ba96-7bbbf34ec44c"'::text WHERE key = 'nowpayments_api_secret';
UPDATE system_settings SET value = '"USD"'::text WHERE key = 'default_currency';

-- Show raw values with length
SELECT key, value, length(value) as char_length FROM system_settings WHERE key LIKE 'nowpayments_%' OR key = 'default_currency' ORDER BY key;
