-- Requests Table for Idempotency
-- Used for ensuring idempotent behavior in critical endpoints

CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    status INTEGER DEFAULT 200,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_key_endpoint ON requests(idempotency_key, endpoint);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);

-- Clean up old entries (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_requests()
RETURNS void AS $$
BEGIN
    DELETE FROM requests WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old entries (optional)
-- This would require pg_cron extension to be installed
-- SELECT cron.schedule('cleanup-requests', '0 */6 * * *', 'SELECT cleanup_old_requests();');

COMMENT ON TABLE requests IS 'Stores idempotent request/response data for critical endpoints';
COMMENT ON COLUMN requests.idempotency_key IS 'Unique key for idempotent requests';
COMMENT ON COLUMN requests.endpoint IS 'API endpoint path';
COMMENT ON COLUMN requests.request_data IS 'Original request data';
COMMENT ON COLUMN requests.response_data IS 'Response data for replay';
COMMENT ON COLUMN requests.status IS 'HTTP status code';
COMMENT ON COLUMN requests.created_at IS 'When the request was first made';
COMMENT ON COLUMN requests.updated_at IS 'When the request was last updated';

SELECT 'Requests table for idempotency created successfully' as status;
