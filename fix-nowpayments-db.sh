#!/bin/bash

# Fix NowPayments Database Values
# This script converts string values to proper JSON format

echo "🔧 Fixing NowPayments Database Values..."

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="swiftnexus"
DB_USER="postgres"
DB_PASSWORD="GUd^&jV,fH&9ba&"

# Export password for PostgreSQL
export PGPASSWORD="$DB_PASSWORD"

echo "🗄️ Updating NowPayments values to proper JSON format..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Update NowPayments values to proper JSON format
UPDATE system_settings 
SET value = CASE 
    WHEN key = 'nowpayments_api_key' THEN '"KVAZXQH-9YCM35R-QYPN2W9-75M9ZPD"'
    WHEN key = 'nowpayments_ipn_secret' THEN '"gXKuLNIqNpblGzcPaAL0xTjA2Cnre92U"'
    WHEN key = 'nowpayments_api_secret' THEN '"4f3ee86d-48d6-44e2-ba96-7bbbf34ec44c"'
    ELSE value
END
WHERE key IN ('nowpayments_api_key', 'nowpayments_ipn_secret', 'nowpayments_api_secret');

-- Show updated values
SELECT key, value FROM system_settings WHERE key LIKE 'nowpayments_%';

EOF

if [ $? -eq 0 ]; then
    echo "✅ NowPayments database values fixed successfully!"
else
    echo "❌ Database fix failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo "🎉 NowPayments configuration is ready!"
