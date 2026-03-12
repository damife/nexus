-- Update PostgreSQL user password
ALTER USER postgres PASSWORD 'GUd^&jV,fH&9ba&X1';

-- Fix Resend API key with proper JSON escaping
UPDATE system_settings SET value = '"\"re_Lgvr8hqK_Mxq8CSucBjKzdNEUzPbs6sL5\""'::jsonb WHERE key = 'resend_api_key';

-- Show updated values
SELECT key, value FROM system_settings WHERE key IN ('resend_api_key', 'resend_from_email') ORDER BY key;
