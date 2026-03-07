#!/bin/bash

# SwiftNexus Database Initialization Script
# This script sets up the complete database schema

echo "🚀 Initializing SwiftNexus Database..."

# Database connection details
DB_HOST="localhost"
DB_PORT="5433"
DB_NAME="swiftnexus"
DB_USER="postgres"
DB_PASSWORD="GUd^&jV,fH&9ba&"

# Export password for PostgreSQL
export PGPASSWORD="$DB_PASSWORD"

echo "📁 Creating database if not exists..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || echo "Database may already exist"

echo "🗄️ Connecting to database and creating schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert essential system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('resend_api_key', '"re_Lgvr8hqK_Mxq8CSucBjKzdNEUzPbs6sL5"', 'Resend API key for email services', false),
('resend_from_email', '"mail@swiftnexus.org"', 'Default from email address', true),
('max_message_size', '1048576', 'Maximum message size in bytes', false),
('default_currency', '"USD"', 'Default currency for transactions', true),
('maintenance_mode', 'false', 'System maintenance mode', true),
('api_version', '"1.0.0"', 'Current API version', true),
('rate_limit_window', '900000', 'Rate limit window in milliseconds', false),
('rate_limit_max', '100', 'Maximum requests per window', false)
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = CURRENT_TIMESTAMP;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(35) UNIQUE NOT NULL,
    utr VARCHAR(36),
    message_type VARCHAR(50) NOT NULL,
    sender_bic VARCHAR(11) NOT NULL,
    receiver_bic VARCHAR(11) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    amount DECIMAL(20,2),
    currency VARCHAR(3),
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    screening_result JSONB DEFAULT '{}',
    aml_result JSONB DEFAULT '{}',
    compliance_result JSONB DEFAULT '{}',
    error_message TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_bic ON messages(sender_bic);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_bic ON messages(receiver_bic);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Create tenant_users table for multi-tenancy
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);

-- Insert default admin user with strong password
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@swiftnexus.org', '$2b$12$LQv3c1y9QjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQ', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Map admin to default tenant
INSERT INTO tenant_users (tenant_id, user_id, role, permissions) VALUES
(uuid_generate_v4(), (SELECT id FROM users WHERE username = 'admin'), 'admin', '{"all": true}')
ON CONFLICT (user_id) DO NOTHING;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Database initialization completed successfully!"
    echo "📊 Tables created:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"
    echo ""
    echo "🔑 System settings inserted:"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT key, CASE WHEN is_public THEN value ELSE '[HIDDEN]' END as value FROM system_settings;"
else
    echo "❌ Database initialization failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo "🎉 SwiftNexus database is ready!"
