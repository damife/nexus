-- 🏦 **SwiftNexus Enterprise Database Setup**
-- Complete database schema for professional SWIFT messaging system

-- Create database
CREATE DATABASE swift_nexus;
\c swift_nexus;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_bic ON messages(sender_bic);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_bic ON messages(receiver_bic);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ========================================
-- TENANT MANAGEMENT
-- ========================================

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    database_name VARCHAR(255) NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
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

-- Tenant users mapping
CREATE TABLE tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);

-- ========================================
-- CORRESPONDENT BANKS
-- ========================================

-- Correspondent banks table
CREATE TABLE correspondent_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bic_code VARCHAR(11) UNIQUE NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    country VARCHAR(3) NOT NULL,
    city VARCHAR(100),
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 1,
    cost_factor DECIMAL(5,4) DEFAULT 1.0000,
    reliability_score DECIMAL(3,3) DEFAULT 0.999,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- ROUTING SYSTEM
-- ========================================

-- Routing rules table
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,
    routing_method VARCHAR(50) NOT NULL,
    priority_level INTEGER DEFAULT 1,
    amount_min DECIMAL(20,2),
    amount_max DECIMAL(20,2),
    destination_country VARCHAR(3),
    conditions JSONB DEFAULT '{}',
    cost_factor DECIMAL(5,4) DEFAULT 1.0000,
    speed_factor DECIMAL(5,4) DEFAULT 1.0000,
    reliability_factor DECIMAL(5,4) DEFAULT 1.0000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routing decisions log
CREATE TABLE routing_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id UUID NOT NULL,
    message_type VARCHAR(50) NOT NULL,
    selected_route VARCHAR(50) NOT NULL,
    route_factors JSONB NOT NULL,
    decision_reason TEXT,
    estimated_cost DECIMAL(20,2),
    estimated_speed VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- MESSAGES
-- ========================================

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id VARCHAR(35) UNIQUE NOT NULL, -- UETR or transaction reference
    utr VARCHAR(36), -- Unique Transaction Reference
    message_type VARCHAR(50) NOT NULL,
    sender_bic VARCHAR(11) NOT NULL,
    receiver_bic VARCHAR(11) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    amount DECIMAL(20,2),
    currency VARCHAR(3),
    status VARCHAR(20) DEFAULT 'pending',
    created_by UUID REFERENCES users(id),
    correspondent_bank_id UUID REFERENCES correspondent_banks(id),
    routing_decision_id UUID REFERENCES routing_decisions(id),
    screening_result JSONB DEFAULT '{}',
    aml_result JSONB DEFAULT '{}',
    compliance_result JSONB DEFAULT '{}',
    error_message TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- COMPLIANCE & SECURITY
-- ========================================

-- Sanctions list
CREATE TABLE sanctions_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'individual', 'entity', 'vessel'
    name VARCHAR(255) NOT NULL,
    bic_code VARCHAR(11),
    account_number VARCHAR(50),
    address TEXT,
    country VARCHAR(3),
    date_of_birth DATE,
    nationality VARCHAR(3),
    sanction_program VARCHAR(100),
    sanction_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    source VARCHAR(100),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- High-risk countries
CREATE TABLE high_risk_countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'high',
    risk_factors JSONB DEFAULT '{}',
    additional_monitoring BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance checks
CREATE TABLE compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'aml', 'sanctions', 'geographic', 'amount'
    check_result VARCHAR(20) NOT NULL, -- 'pass', 'fail', 'warning'
    risk_score INTEGER DEFAULT 0,
    details JSONB DEFAULT '{}',
    required_actions JSONB DEFAULT '[]',
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- BILLING & FEES
-- ========================================

-- Fee structure
CREATE TABLE fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    volume_threshold DECIMAL(20,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, message_type, currency, volume_threshold)
);

-- Pricing history
CREATE TABLE pricing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,
    old_amount DECIMAL(20,2) NOT NULL,
    new_amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    changed_by UUID REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- AUDIT & LOGGING
-- ========================================

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- 'error', 'warn', 'info', 'debug'
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SETTINGS & CONFIGURATION
-- ========================================

-- System settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant settings
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, key)
);

-- ========================================
-- SAMPLE DATA INSERTION
-- ========================================

-- Insert default tenant
INSERT INTO tenants (name, domain, database_name, settings) VALUES
('SwiftNexus Demo', 'demo.swiftnexus.com', 'swift_nexus_demo', '{"max_users": 100, "features": ["swift", "routing", "compliance"]}');

-- Insert admin user
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@swiftnexus.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'admin');

-- Map admin to demo tenant
INSERT INTO tenant_users (tenant_id, user_id, role, permissions) VALUES
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), (SELECT id FROM users WHERE username = 'admin'), 'admin', '{"all": true}');

-- Insert sample correspondent banks
INSERT INTO correspondent_banks (tenant_id, bic_code, bank_name, country, city, priority_level, cost_factor, reliability_score) VALUES
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'SCBLDEFXXXX', 'Standard Chartered Bank', 'DE', 'Frankfurt', 1, 0.0010, 0.999),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'SBININBBXXX', 'State Bank of India', 'IN', 'Mumbai', 2, 0.0015, 0.998),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'CITIUS33XXX', 'Citibank', 'US', 'New York', 1, 0.0012, 0.999),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'HSBCHKHHXXX', 'HSBC Hong Kong', 'HK', 'Hong Kong', 1, 0.0011, 0.999),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'DEUTDEFFXXX', 'Deutsche Bank', 'DE', 'Frankfurt', 1, 0.0010, 0.999);

-- Insert sample routing rules
INSERT INTO routing_rules (tenant_id, message_type, routing_method, priority_level, amount_min, amount_max, cost_factor, speed_factor, reliability_factor) VALUES
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 'direct_swift', 1, 0.01, 10000, 0.0010, 1.0, 1.0),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 'direct_swift', 1, 10000.01, 100000, 0.0008, 1.0, 1.0),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 'correspondent', 2, 0.01, 100000, 0.0015, 0.8, 0.998),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT700', 'trade_direct', 1, 0.01, 1000000, 0.0020, 0.8, 0.998),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT540', 'securities_direct', 1, 0.01, 10000000, 0.0005, 1.0, 0.999),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT940', 'batch', 3, 0.01, 999999999, 0.0050, 0.5, 0.995);

-- Insert sample fees
INSERT INTO fees (tenant_id, message_type, amount, currency, volume_threshold, discount_percentage) VALUES
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 10.00, 'USD', 0, 0),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 8.00, 'USD', 100, 20),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT103', 6.00, 'USD', 1000, 40),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT700', 50.00, 'USD', 0, 0),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT540', 5.00, 'USD', 0, 0),
((SELECT id FROM tenants WHERE domain = 'demo.swiftnexus.com'), 'MT940', 2.00, 'USD', 0, 0);

-- Insert sample sanctions list entries
INSERT INTO sanctions_list (entity_type, name, bic_code, country, sanction_program, sanction_type) VALUES
('entity', 'Sanctioned Bank A', 'SANCBAAXXXX', 'IR', 'OFAC', 'SDN'),
('entity', 'Sanctioned Bank B', 'SANCBBBXXX', 'KP', 'OFAC', 'SDN'),
('individual', 'Sanctioned Person A', NULL, 'AF', 'OFAC', 'SDN');

-- Insert sample high-risk countries
INSERT INTO high_risk_countries (country_code, country_name, risk_level, additional_monitoring) VALUES
('IR', 'Iran', 'high', true),
('KP', 'North Korea', 'high', true),
('AF', 'Afghanistan', 'medium', true),
('MM', 'Myanmar', 'medium', true);

-- Insert system settings
INSERT INTO system_settings (key, value, description, is_public) VALUES
('max_message_size', '1048576', 'Maximum message size in bytes', false),
('default_currency', 'USD', 'Default currency for transactions', true),
('maintenance_mode', 'false', 'System maintenance mode', true),
('api_version', '1.0.0', 'Current API version', true),
('rate_limit_window', '900000', 'Rate limit window in milliseconds', false),
('rate_limit_max', '100', 'Maximum requests per window', false);

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- View for message statistics
CREATE VIEW message_stats AS
SELECT 
    tenant_id,
    message_type,
    status,
    COUNT(*) as message_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(created_at) as first_message,
    MAX(created_at) as last_message
FROM messages 
GROUP BY tenant_id, message_type, status;

-- View for user activity
CREATE VIEW user_activity AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    tu.tenant_id,
    t.name as tenant_name,
    tu.role,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message,
    u.last_login
FROM users u
LEFT JOIN tenant_users tu ON u.id = tu.user_id
LEFT JOIN tenants t ON tu.tenant_id = t.id
LEFT JOIN messages m ON u.id = m.created_by
GROUP BY u.id, u.username, u.email, tu.tenant_id, t.name, tu.role, u.last_login;

-- View for routing performance
CREATE VIEW routing_performance AS
SELECT 
    rd.tenant_id,
    rd.message_type,
    rd.selected_route,
    COUNT(*) as usage_count,
    AVG(rd.estimated_cost) as avg_cost,
    AVG(CASE WHEN m.status = 'sent' THEN 1 ELSE 0 END) as success_rate,
    AVG(EXTRACT(EPOCH FROM (m.delivered_at - m.created_at))/60) as avg_delivery_time_minutes
FROM routing_decisions rd
LEFT JOIN messages m ON rd.message_id = m.id
GROUP BY rd.tenant_id, rd.message_type, rd.selected_route;

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_correspondent_banks_updated_at BEFORE UPDATE ON correspondent_banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routing_rules_updated_at BEFORE UPDATE ON routing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fees_updated_at BEFORE UPDATE ON fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STORED PROCEDURES
-- ========================================

-- Get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_messages', (SELECT COUNT(*) FROM messages WHERE tenant_id = p_tenant_id),
        'sent_messages', (SELECT COUNT(*) FROM messages WHERE tenant_id = p_tenant_id AND status = 'sent'),
        'pending_messages', (SELECT COUNT(*) FROM messages WHERE tenant_id = p_tenant_id AND status = 'pending'),
        'failed_messages', (SELECT COUNT(*) FROM messages WHERE tenant_id = p_tenant_id AND status = 'failed'),
        'total_amount', (SELECT COALESCE(SUM(amount), 0) FROM messages WHERE tenant_id = p_tenant_id),
        'active_users', (SELECT COUNT(*) FROM tenant_users WHERE tenant_id = p_tenant_id AND is_active = true),
        'correspondent_banks', (SELECT COUNT(*) FROM correspondent_banks WHERE tenant_id = p_tenant_id AND is_active = true),
        'routing_rules', (SELECT COUNT(*) FROM routing_rules WHERE tenant_id = p_tenant_id AND is_active = true)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SECURITY POLICIES (RLS)
-- ========================================

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondent_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_messages ON messages
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_correspondent_banks ON correspondent_banks
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_routing_rules ON routing_rules
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_fees ON fees
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_compliance_checks ON compliance_checks
    FOR ALL TO authenticated_users
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ========================================
-- COMPLETION
-- ========================================

-- Create indexes for views
CREATE INDEX IF NOT EXISTS idx_message_stats_tenant_type ON message_stats(tenant_id, message_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant ON user_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routing_performance_tenant ON routing_performance(tenant_id);

-- Grant permissions (adjust as needed)
-- GRANT USAGE ON SCHEMA public TO swift_nexus_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO swift_nexus_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO swift_nexus_user;

-- Database setup complete
SELECT 'SwiftNexus Enterprise Database Setup Complete!' as status;

-- ========================================
-- CONTENT MANAGEMENT TABLES
-- ========================================

-- Careers table
CREATE TABLE IF NOT EXISTS careers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    requirements JSONB,
    responsibilities JSONB,
    salary VARCHAR(100),
    posted TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- News table
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    image VARCHAR(500),
    author VARCHAR(100),
    category VARCHAR(100),
    tags JSONB,
    published BOOLEAN DEFAULT false,
    published_date TIMESTAMP,
    views INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blogs table
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    image VARCHAR(500),
    author VARCHAR(100),
    category VARCHAR(100),
    tags JSONB,
    published BOOLEAN DEFAULT false,
    published_date TIMESTAMP,
    views INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    event_type VARCHAR(100),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    timezone VARCHAR(50),
    registration_url VARCHAR(500),
    image VARCHAR(500),
    capacity INTEGER,
    registered INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'upcoming',
    tags JSONB,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webinars table
CREATE TABLE IF NOT EXISTS webinars (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    presenter VARCHAR(100),
    duration INTEGER,
    webinar_date TIMESTAMP,
    registration_url VARCHAR(500),
    image VARCHAR(500),
    capacity INTEGER,
    registered INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'upcoming',
    tags JSONB,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url VARCHAR(500),
    thumbnail VARCHAR(500),
    duration VARCHAR(20),
    category VARCHAR(100),
    tags JSONB,
    views INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Case Studies table
CREATE TABLE IF NOT EXISTS case_studies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    client VARCHAR(255),
    industry VARCHAR(100),
    description TEXT,
    challenge TEXT,
    solution TEXT,
    results TEXT,
    image VARCHAR(500),
    tags JSONB,
    published BOOLEAN DEFAULT false,
    published_date TIMESTAMP,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- White Papers table
CREATE TABLE IF NOT EXISTS white_papers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    content TEXT,
    file_url VARCHAR(500),
    thumbnail VARCHAR(500),
    document_type VARCHAR(100),
    tags JSONB,
    published BOOLEAN DEFAULT false,
    published_date TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    file_url VARCHAR(500),
    thumbnail VARCHAR(500),
    report_period VARCHAR(100),
    tags JSONB,
    published BOOLEAN DEFAULT false,
    published_date TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Glossary table
CREATE TABLE IF NOT EXISTS glossary (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL,
    definition TEXT,
    category VARCHAR(100),
    tags JSONB,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leadership table
CREATE TABLE IF NOT EXISTS leadership (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    bio TEXT,
    image VARCHAR(500),
    email VARCHAR(255),
    linkedin VARCHAR(500),
    order_index INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MESSAGE SYSTEM WITH ADMIN APPROVAL WORKFLOW
-- ============================================================================

-- Include the complete message system schema
\i message.sql

-- ============================================================================
-- PAYMENT SYSTEM SCHEMA
-- ============================================================================

-- Include the payment system schema
\i payment.sql

-- ============================================================================
-- SECURITY SYSTEM SCHEMA
-- ============================================================================

-- Include the requests schema
\i requests.sql

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================

SELECT 'SwiftNexus Enterprise Database Setup Complete!' as status;
