-- Analytics and System Health Monitoring Schema for SwiftNexus
-- This file creates tables for advanced analytics, system health, and monitoring

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- cpu, memory, disk, network, etc.
    metric_name VARCHAR(100) NOT NULL, -- cpu_usage, memory_usage, disk_usage, etc.
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20), -- %, MB, GB, ms, etc.
    hostname VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_system_metrics_type (metric_type),
    INDEX idx_system_metrics_created (created_at)
);

-- API Log Table for performance monitoring
CREATE TABLE IF NOT EXISTS api_log (
    id SERIAL PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time INTEGER, -- in milliseconds
    request_size INTEGER, -- in bytes
    response_size INTEGER, -- in bytes
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_log_endpoint (endpoint),
    INDEX idx_api_log_status (status_code),
    INDEX idx_api_log_created (created_at),
    INDEX idx_api_log_response_time (response_time)
);

-- Error Log Table
CREATE TABLE IF NOT EXISTS error_log (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(50) NOT NULL, -- system, application, database, network
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    file_path VARCHAR(500),
    line_number INTEGER,
    function_name VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    severity VARCHAR(20) DEFAULT 'error', -- debug, info, warning, error, critical
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_error_log_type (error_type),
    INDEX idx_error_log_severity (severity),
    INDEX idx_error_log_created (created_at),
    INDEX idx_error_log_resolved (resolved)
);

-- User Activity Log Table
CREATE TABLE IF NOT EXISTS user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL, -- login, logout, message_sent, etc.
    activity_description TEXT,
    resource_type VARCHAR(50), -- message, user, system, etc.
    resource_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    success BOOLEAN DEFAULT TRUE,
    metadata JSONB, -- additional activity data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_activity_user (user_id),
    INDEX idx_user_activity_type (activity_type),
    INDEX idx_user_activity_created (created_at)
);

-- Security Log Table
CREATE TABLE IF NOT EXISTS security_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- login_attempt, failed_login, etc.
    event_description TEXT,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    threat_level VARCHAR(20) DEFAULT 'unknown', -- low, medium, high, critical
    blocked BOOLEAN DEFAULT FALSE,
    details JSONB, -- additional security event data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_security_log_type (event_type),
    INDEX idx_security_log_severity (severity),
    INDEX idx_security_log_created (created_at),
    INDEX idx_security_log_ip (ip_address)
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- performance, security, system, etc.
    alert_title VARCHAR(200) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    status VARCHAR(20) DEFAULT 'active', -- active, acknowledged, resolved
    source VARCHAR(100), -- database, api, system, etc.
    metric_name VARCHAR(100),
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    metadata JSONB,
    acknowledged_by INTEGER REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    auto_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_system_alerts_type (alert_type),
    INDEX idx_system_alerts_severity (severity),
    INDEX idx_system_alerts_status (status),
    INDEX idx_system_alerts_created (created_at)
);

-- Analytics Cache Table for performance optimization
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    cache_type VARCHAR(50) NOT NULL, -- dashboard, report, metrics, etc.
    time_range VARCHAR(20),
    filters JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_cache_key (cache_key),
    INDEX idx_analytics_cache_type (cache_type),
    INDEX idx_analytics_cache_expires (expires_at)
);

-- Performance Benchmarks Table
CREATE TABLE IF NOT EXISTS performance_benchmarks (
    id SERIAL PRIMARY KEY,
    benchmark_type VARCHAR(50) NOT NULL, -- response_time, throughput, etc.
    benchmark_name VARCHAR(100) NOT NULL,
    benchmark_value DECIMAL(10,2) NOT NULL,
    benchmark_unit VARCHAR(20),
    percentile INTEGER, -- 50, 95, 99
    time_period VARCHAR(20), -- daily, weekly, monthly
    date_period DATE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_performance_benchmarks_type (benchmark_type),
    INDEX idx_performance_benchmarks_period (date_period)
);

-- Health Check History Table
CREATE TABLE IF NOT EXISTS health_check_history (
    id SERIAL PRIMARY KEY,
    component_name VARCHAR(100) NOT NULL, -- database, api, system, etc.
    component_type VARCHAR(50) NOT NULL, -- service, database, external, etc.
    status VARCHAR(20) NOT NULL, -- healthy, warning, critical
    response_time INTEGER, -- in milliseconds
    error_message TEXT,
    check_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_health_check_component (component_name),
    INDEX idx_health_check_status (status),
    INDEX idx_health_check_created (created_at)
);

-- Report Generation Log Table
CREATE TABLE IF NOT EXISTS report_generation_log (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL, -- executive, compliance, performance, etc.
    report_name VARCHAR(200),
    report_format VARCHAR(20), -- json, csv, pdf
    parameters JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, generating, completed, failed
    file_path VARCHAR(500),
    file_size INTEGER,
    generated_by INTEGER REFERENCES users(id),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_report_generation_type (report_type),
    INDEX idx_report_generation_status (status),
    INDEX idx_report_generation_user (generated_by)
);

-- Analytics Settings Table
CREATE TABLE IF NOT EXISTS analytics_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) NOT NULL, -- cache, alerts, retention, etc.
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_settings_key (setting_key)
);

-- Insert default analytics settings
INSERT INTO analytics_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('cache_timeout', '300', 'cache', 'Cache timeout in seconds for analytics data', false),
('alert_thresholds', '{"cpu": 80, "memory": 85, "disk": 90, "response_time": 1000}', 'alerts', 'Threshold values for system alerts', false),
('data_retention_days', '90', 'retention', 'Number of days to retain analytics data', false),
('real_time_refresh_interval', '30', 'performance', 'Real-time refresh interval in seconds', false),
('enable_predictive_analytics', 'true', 'features', 'Enable predictive analytics features', true),
('max_concurrent_reports', '5', 'performance', 'Maximum concurrent report generation jobs', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_user_activity_metadata ON user_activity_log USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_security_log_details ON security_log USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_system_alerts_metadata ON system_alerts USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_data ON analytics_cache USING GIN (cache_data);
CREATE INDEX IF NOT EXISTS idx_performance_benchmarks_metadata ON performance_benchmarks USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_health_check_details ON health_check_history USING GIN (check_details);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_system_alerts_updated_at BEFORE UPDATE ON system_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at BEFORE UPDATE ON analytics_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_settings_updated_at BEFORE UPDATE ON analytics_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active system alerts
CREATE OR REPLACE VIEW active_system_alerts AS
SELECT 
    id,
    alert_type,
    alert_title,
    alert_message,
    severity,
    source,
    metric_name,
    current_value,
    threshold_value,
    created_at,
    CASE 
        WHEN severity = 'critical' THEN 1
        WHEN severity = 'high' THEN 2
        WHEN severity = 'medium' THEN 3
        WHEN severity = 'low' THEN 4
    END as priority
FROM system_alerts 
WHERE status = 'active'
ORDER BY priority, created_at DESC;

-- Create view for system health summary
CREATE OR REPLACE VIEW system_health_summary AS
SELECT 
    component_name,
    component_type,
    status,
    AVG(response_time) as avg_response_time,
    COUNT(*) as total_checks,
    COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_checks,
    COUNT(CASE WHEN status = 'warning' THEN 1 END) as warning_checks,
    COUNT(CASE WHEN status = 'critical' THEN 1 END) as critical_checks,
    MAX(created_at) as last_check
FROM health_check_history 
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY component_name, component_type, status
ORDER BY component_name;

-- Create view for daily API performance
CREATE OR REPLACE VIEW daily_api_performance AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_requests,
    COUNT(CASE WHEN status_code < 400 THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as failed_requests,
    ROUND(AVG(response_time), 2) as avg_response_time,
    ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY response_time), 2) as p50_response_time,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time), 2) as p95_response_time,
    ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time), 2) as p99_response_time
FROM api_log 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    DATE(created_at) as date,
    activity_type,
    COUNT(*) as activity_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN success = TRUE THEN 1 END) as successful_activities,
    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_activities
FROM user_activity_log 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), activity_type
ORDER BY date DESC, activity_count DESC;

-- Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON system_metrics, api_log, error_log, user_activity_log, security_log, system_alerts, analytics_cache, performance_benchmarks, health_check_history, report_generation_log, analytics_settings TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;
