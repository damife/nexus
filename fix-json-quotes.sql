-- Fix NowPayments values to be proper JSON strings with quotes
UPDATE system_settings SET value = '"KVAZXQH-9YCM35R-QYPN2W9-75M9ZPD"' WHERE key = 'nowpayments_api_key';
UPDATE system_settings SET value = '"gXKuLNIqNpblGzcPaAL0xTjA2Cnre92U"' WHERE key = 'nowpayments_ipn_secret';
UPDATE system_settings SET value = '"4f3ee86d-48d6-44e2-ba96-7bbbf34ec44c"' WHERE key = 'nowpayments_api_secret';
UPDATE system_settings SET value = '"USD"' WHERE key = 'default_currency';

-- Show updated values
SELECT key, value FROM system_settings WHERE key LIKE 'nowpayments_%' OR key = 'default_currency' ORDER BY key;
