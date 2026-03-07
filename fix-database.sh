#!/bin/bash

# SwiftNexus Database Schema Fix Script
# This script fixes the database schema issues

echo "🔧 Fixing SwiftNexus Database Schema..."

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="swiftnexus"
DB_USER="postgres"
DB_PASSWORD="GUd^&jV,fH&9ba&"

# Export password for PostgreSQL
export PGPASSWORD="$DB_PASSWORD"

echo "🗄️ Adding missing columns to system_settings table..."

# Add missing columns if they don't exist
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Add value column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='value'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN value JSONB;
        RAISE NOTICE 'Added value column';
    END IF;
END $$;

-- Add setting_key column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='system_settings' AND column_name='setting_key'
    ) THEN
        ALTER TABLE system_settings ADD COLUMN setting_key VARCHAR(100);
        RAISE NOTICE 'Added setting_key column';
    END IF;
END $$;

-- Update data to sync columns
UPDATE system_settings SET 
    setting_key = key,
    value = setting_value
WHERE setting_key IS NULL OR value IS NULL;

-- Show current schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'system_settings' ORDER BY ordinal_position;

-- Show current data
SELECT key, setting_key, setting_value, value FROM system_settings LIMIT 5;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Database schema fix completed successfully!"
else
    echo "❌ Database schema fix failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo "🎉 SwiftNexus database schema is fixed!"
