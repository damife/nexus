#!/bin/bash

# Simple static server for production build
cd /root/swiftnexus/dist

# Start Python 3 HTTP server on port 3001
python3 -m http.server 3001 --bind 0.0.0.0 &

echo "🚀 Static server started on port 3001"
echo "📱 Access at: http://localhost:3001"
