-- Final fix for all non-JSON values with proper JSON format
UPDATE system_settings SET value = '"1.0.0"' WHERE key = 'api_version';
UPDATE system_settings SET value = '"USD"' WHERE key = 'default_currency';
UPDATE system_settings SET value = 'false' WHERE key = 'maintenance_mode';
UPDATE system_settings SET value = '1048576' WHERE key = 'max_message_size';
UPDATE system_settings SET value = '100' WHERE key = 'rate_limit_max';
UPDATE system_settings SET value = '900000' WHERE key = 'rate_limit_window';

-- Show final values
SELECT key, value FROM system_settings ORDER BY key;
