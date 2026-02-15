#!/bin/bash

# Setup Nginx for SwiftNexus Enterprise with Clean URLs
# Usage: ./nginxsetup.sh [development|production]
# Default: development

echo "🚀 Setting up Nginx for SwiftNexus Enterprise..."

# Get environment mode
MODE="${1:-development}"
echo "Installation Mode: $MODE"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt update
    apt install -y nginx
else
    echo "✅ Nginx is already installed"
fi

# Create sites-available directory if it doesn't exist
mkdir -p /etc/nginx/sites-available

# Copy our Nginx configuration
echo "📝 Copying Nginx configuration..."
if [ "$MODE" = "production" ]; then
    # Production configuration
    sed "s|/var/www/swiftnexus|/var/www/swiftnexus|g" /c/xamppp/htdocs/3rdparty/cleanurls.conf > /etc/nginx/sites-available/swiftnexus
    sed -i 's|localhost:3000|localhost:3000|g' /etc/nginx/sites-available/swiftnexus
    sed -i 's|localhost:5000|localhost:5000|g' /etc/nginx/sites-available/swiftnexus
    sed -i 's|yourdomain.com|yourdomain.com|g' /etc/nginx/sites-available/swiftnexus
else
    # Development configuration
    sed "s|/var/www/swiftnexus|/c/xamppp/htdocs/3rdparty|g" /c/xamppp/htdocs/3rdparty/cleanurls.conf > /etc/nginx/sites-available/swiftnexus
    sed -i 's|localhost:3000|localhost:3000|g' /etc/nginx/sites-available/swiftnexus
    sed -i 's|localhost:5000|localhost:5000|g' /etc/nginx/sites-available/swiftnexus
fi

# Remove default site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Enable our site
echo "🔗 Enabling SwiftNexus site..."
ln -s /etc/nginx/sites-available/swiftnexus /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Reload Nginx
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx reloaded successfully"
        echo "🎯 Clean URLs are now active!"
        echo ""
        echo "📋 Test these URLs:"
        if [ "$MODE" = "production" ]; then
            echo "   http://yourdomain.com/ - Homepage"
            echo "   http://yourdomain.com/careers - Careers page"
            echo "   http://yourdomain.com/news - News page"
            echo "   http://yourdomain.com/contact - Contact page"
            echo "   http://yourdomain.com/login - React login"
            echo "   https://yourdomain.com/admin - Admin dashboard"
        else
            echo "   http://localhost/ - Homepage"
            echo "   http://localhost/careers - Careers page"
            echo "   http://localhost/news - News page"
            echo "   http://localhost/contact - Contact page"
            echo "   http://localhost/login - React login"
            echo "   http://localhost/admin - Admin dashboard"
        fi
        echo ""
        echo "🚀 Your clean URLs are ready!"
        echo ""
        echo "🔧 Configuration file: /etc/nginx/sites-available/swiftnexus"
        echo "🔗 Enabled site: /etc/nginx/sites-enabled/swiftnexus"
        echo "📊 Status: nginx -t && systemctl status nginx"
        echo ""
        echo "🎯 Mode: $MODE"
    else
        echo "❌ Failed to reload Nginx"
        exit 1
    fi
else
    echo "❌ Nginx configuration has errors"
    echo "Please check the configuration and try again."
    exit 1
fi

echo ""
echo "✅ Nginx setup complete!"
echo "📁 Configuration file: /etc/nginx/sites-available/swiftnexus"
echo "🔗 Enabled site: /etc/nginx/sites-enabled/swiftnexus"
echo "📊 Status: nginx -t && systemctl status nginx"
