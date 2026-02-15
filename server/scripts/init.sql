-- SwiftNexus Enterprise - Database Initialization Script
-- Production-ready PostgreSQL setup

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS swiftnexus_prod;

-- Connect to the database
\c swiftnexus_prod;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'operator')),
    is_active BOOLEAN DEFAULT true,
    balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create banks table
CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    swift_code VARCHAR(11) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    message_type VARCHAR(50) NOT NULL,
    swift_code VARCHAR(11),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    transaction_id VARCHAR(255) UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    balance_before DECIMAL(15,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    reference_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_banks_swift_code ON banks(swift_code);
CREATE INDEX IF NOT EXISTS idx_banks_country ON banks(country);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON banks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'admin@swiftnexus.com',
    '$2b$10$rQZ8kHWKtGYIuA5tJ5Kz9eYjFJ5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X',
    'System',
    'Administrator',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample banks
INSERT INTO banks (name, swift_code, country, city, is_active) VALUES
('Bank of America', 'BOFAUS3N', 'United States', 'New York', true),
('JPMorgan Chase', 'CHASUS33', 'United States', 'New York', true),
('Citibank', 'CITIUS33', 'United States', 'New York', true),
('Wells Fargo', 'WFBIUS6S', 'United States', 'San Francisco', true),
('HSBC Bank', 'HSBCUS33', 'United States', 'New York', true)
ON CONFLICT (swift_code) DO NOTHING;

-- Create view for user balance summary
CREATE OR REPLACE VIEW user_balance_summary AS
SELECT 
    u.id,
    u.uuid,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.balance,
    COALESCE(SUM(CASE WHEN bt.transaction_type = 'credit' THEN bt.amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(CASE WHEN bt.transaction_type = 'debit' THEN bt.amount ELSE 0 END), 0) as total_debits,
    COUNT(bt.id) as transaction_count,
    u.created_at
FROM users u
LEFT JOIN balance_transactions bt ON u.id = bt.user_id
GROUP BY u.id, u.uuid, u.email, u.first_name, u.last_name, u.role, u.balance, u.created_at;

-- Create view for message statistics
CREATE OR REPLACE VIEW message_statistics AS
SELECT 
    m.status,
    COUNT(*) as count,
    SUM(CASE WHEN m.amount IS NOT NULL THEN m.amount ELSE 0 END) as total_amount,
    DATE_TRUNC('day', m.created_at) as date
FROM messages m
GROUP BY m.status, DATE_TRUNC('day', m.created_at)
ORDER BY date DESC;

-- Grant permissions to the application user
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'swiftnexus_user') THEN
        CREATE ROLE swiftnexus_user WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE swiftnexus_prod TO swiftnexus_user;
GRANT USAGE ON SCHEMA public TO swiftnexus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO swiftnexus_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO swiftnexus_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO swiftnexus_user;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO swiftnexus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO swiftnexus_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO swiftnexus_user;

-- Create database health check function
CREATE OR REPLACE FUNCTION health_check()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'database', 'healthy',
        'timestamp', CURRENT_TIMESTAMP,
        'users_count', (SELECT COUNT(*) FROM users),
        'banks_count', (SELECT COUNT(*) FROM banks),
        'messages_count', (SELECT COUNT(*) FROM messages),
        'payments_count', (SELECT COUNT(*) FROM payments)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create database statistics function
CREATE OR REPLACE FUNCTION database_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'users', (SELECT COUNT(*) FROM users),
        'banks', (SELECT COUNT(*) FROM banks),
        'messages', (SELECT COUNT(*) FROM messages),
        'payments', (SELECT COUNT(*) FROM payments),
        'balance_transactions', (SELECT COUNT(*) FROM balance_transactions),
        'audit_logs', (SELECT COUNT(*) FROM audit_logs),
        'total_balance', (SELECT COALESCE(SUM(balance), 0) FROM users),
        'timestamp', CURRENT_TIMESTAMP
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
