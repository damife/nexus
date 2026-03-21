#!/bin/bash

# Setup Nginx for SwiftNexus Enterprise
# Uses nginx.conf (pure reverse proxy: frontend 3001, backend 5000)
# Usage: sudo ./nginxsetup.sh
#
# Prerequisites:
#   - SSL certs at /etc/letsencrypt/live/swiftnexus.org/ (for production HTTPS)
#   - Or modify nginx.conf for HTTP-only if no SSL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/nginx.conf"
SITE_NAME="swiftnexus"
SITES_AVAILABLE="/etc/nginx/sites-available/$SITE_NAME"
SITES_ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"

echo "SwiftNexus Enterprise - Nginx Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script must be run as root (use sudo)"
    exit 1
fi

# Verify nginx.conf exists
if [ ! -f "$NGINX_CONF" ]; then
    echo "Error: nginx.conf not found at $NGINX_CONF"
    exit 1
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
else
    echo "Nginx is already installed"
fi

# Ensure sites-available exists
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

# Copy nginx.conf to sites-available
echo "Copying nginx.conf to /etc/nginx/sites-available/$SITE_NAME..."
cp "$NGINX_CONF" "$SITES_AVAILABLE"

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    echo "Removing default site..."
    rm -f /etc/nginx/sites-enabled/default
fi

# Enable our site (symlink)
echo "Enabling SwiftNexus site..."
ln -sf "$SITES_AVAILABLE" "$SITES_ENABLED"

# Test Nginx configuration
echo "Testing Nginx configuration..."
if nginx -t 2>/dev/null; then
    echo "Nginx configuration is valid"
    echo "Reloading Nginx..."
    systemctl reload nginx
    echo ""
    echo "Nginx setup complete!"
    echo ""
    echo "Configuration: $SITES_AVAILABLE"
    echo "Enabled:       $SITES_ENABLED"
    echo ""
    echo "URLs (with SSL):"
    echo "  Site:   https://swiftnexus.org"
    echo "  Admin:  https://swiftnexus.org/swiftadmin/admin/dashboard"
    echo "  Login:  https://swiftnexus.org/pages/login"
    echo "  Install: https://swiftnexus.org/install"
    echo ""
    echo "Ensure backend (5000) and frontend (3001) are running: ./start.sh production background"
else
    echo "Nginx configuration has errors. Fix before reloading."
    exit 1
fi
