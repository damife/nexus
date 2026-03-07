-- Fix JSON values that are not properly formatted
UPDATE system_settings 
SET value = CASE 
    WHEN key = 'default_currency' THEN '"USD"'
    WHEN key = 'maintenance_mode' THEN 'false'
    WHEN key = 'max_message_size' THEN '1048576'
    WHEN key = 'rate_limit_max' THEN '100'
    WHEN key = 'rate_limit_window' THEN '900000'
    WHEN key = 'api_version' THEN '"1.0.0"'
    ELSE value
END
WHERE key IN ('default_currency', 'maintenance_mode', 'max_message_size', 'rate_limit_max', 'rate_limit_window', 'api_version');

-- Show updated values
SELECT key, value FROM system_settings ORDER BY key;
