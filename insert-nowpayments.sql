INSERT INTO system_settings (key, value, description, is_public) VALUES 
('nowpayments_api_key', '"KVAZXQH-9YCM35R-QYPN2W9-75M9ZPD"', 'NowPayments API Key', false),
('nowpayments_ipn_secret', '"gXKuLNIqNpblGzcPaAL0xTjA2Cnre92U"', 'NowPayments IPN Secret', false),
('nowpayments_api_secret', '"4f3ee86d-48d6-44e2-ba96-7bbbf34ec44c"', 'NowPayments API Secret', false)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
