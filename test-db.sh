#!/bin/bash

# Test database values for JSON parsing
PGPASSWORD='GUd^&jV,fH&9ba&'
psql -h localhost -p 5433 -U postgres -d swiftnexus << 'EOF'
SELECT key, value FROM system_settings WHERE key LIKE 'nowpayments_%' OR key = 'default_currency' ORDER BY key;
EOF
