-- Fix all remaining non-JSON values
UPDATE system_settings 
SET value = CASE 
    WHEN key = 'maintenance_mode' THEN 'false'
    WHEN key = 'max_message_size' THEN '1048576'
    WHEN key = 'rate_limit_max' THEN '100'
    WHEN key = 'rate_limit_window' THEN '900000'
    ELSE value
END
WHERE key IN ('maintenance_mode', 'max_message_size', 'rate_limit_max', 'rate_limit_window');

-- Show final values
SELECT key, value FROM system_settings ORDER BY key;
