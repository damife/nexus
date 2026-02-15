#!/bin/bash

# SwiftNexus Enterprise - Installation Script for Linux/macOS
# Usage: ./install.sh [development|production]
# Default: development

echo "========================================"
echo " SwiftNexus Enterprise - Installation"
echo "========================================"
echo ""

# Get environment mode
MODE="${1:-development}"
echo "Installation Mode: $MODE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "[1/8] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo ""
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo ""
    echo "Please install Node.js:"
    echo "  - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  - macOS: brew install node"
    echo "  - Or download from: https://nodejs.org/"
    echo ""
    exit 1
fi

echo -e "${GREEN}[OK]${NC} Node.js is installed"
node --version
echo ""

# Check npm
echo "[2/8] Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo ""
    echo -e "${RED}ERROR: npm is not installed!${NC}"
    echo "npm should come with Node.js installation."
    echo ""
    exit 1
fi

echo -e "${GREEN}[OK]${NC} npm is installed"
npm --version
echo ""

# Clean old installations
echo "[3/8] Cleaning old installations..."
if [ -d "node_modules" ]; then
    echo "Removing old frontend dependencies..."
    rm -rf node_modules
fi
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
fi
if [ -d "server/node_modules" ]; then
    echo "Removing old backend dependencies..."
    rm -rf server/node_modules
fi
if [ -f "server/package-lock.json" ]; then
    rm -f server/package-lock.json
fi
echo -e "${GREEN}[OK]${NC} Cleanup complete"
echo ""

# Install frontend dependencies
echo "[4/8] Installing frontend dependencies..."
echo "This may take a few minutes..."
echo ""
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}ERROR: Failed to install frontend dependencies!${NC}"
    echo "Please check your internet connection and try again."
    echo ""
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"
echo ""

# Install backend dependencies
echo "[5/8] Installing backend dependencies..."
echo "This may take a few minutes..."
echo ""
cd server
npm install
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}ERROR: Failed to install backend dependencies!${NC}"
    echo "Please check your internet connection and try again."
    echo ""
    cd ..
    exit 1
fi
cd ..
echo -e "${GREEN}[OK]${NC} Backend dependencies installed"
echo ""

# Create .env file if it doesn't exist
echo "[6/8] Configuring environment variables..."
if [ ! -f "server/.env" ]; then
    echo "Creating .env file..."
    cat > server/.env << EOF
# SwiftNexus Enterprise - Environment Configuration
# Generated on $(date)

# Server Configuration
PORT=5000
NODE_ENV=$MODE

# JWT Secret (CHANGE THIS IN PRODUCTION!)
JWT_SECRET=swiftnexus-secret-key-2024-change-this-in-production-$(date +%s)

# Frontend URL
if [ "$MODE" = "production" ]; then
    FRONTEND_URL=https://yourdomain.com
    CORS_ORIGIN=https://yourdomain.com
else
    FRONTEND_URL=http://localhost:3000
    CORS_ORIGIN=http://localhost:3000
fi

# API Configuration
API_VERSION=v1

# Database Configuration (Required for production)
if [ "$MODE" = "production" ]; then
    DB_HOST=localhost
    DB_PORT=5432
    DB_NAME=swiftnexus
    DB_USER=postgres
    DB_PASSWORD=your_secure_password
else
    # DB_HOST=localhost
    # DB_PORT=5432
    # DB_NAME=swiftnexus
    # DB_USER=postgres
    # DB_PASSWORD=your_password
fi

# CORS Configuration
CORS_ORIGIN=$CORS_ORIGIN

# Security
BCRYPT_ROUNDS=10
JWT_EXPIRES_IN=24h

if [ "$MODE" = "production" ]; then
    # Production Settings
    LOG_LEVEL=warn
    RATE_LIMIT_WINDOW=15
    RATE_LIMIT_MAX=100
fi
EOF
    echo -e "${GREEN}[OK]${NC} .env file created"
else
    echo -e "${GREEN}[OK]${NC} .env file already exists"
fi
echo ""

# Create logs directory
echo "[7/8] Creating necessary directories..."
if [ ! -d "server/logs" ]; then
    mkdir -p server/logs
    echo -e "${GREEN}[OK]${NC} Logs directory created"
else
    echo -e "${GREEN}[OK]${NC} Logs directory exists"
fi
if [ ! -d "uploads" ]; then
    mkdir -p uploads
    echo -e "${GREEN}[OK]${NC} Uploads directory created"
else
    echo -e "${GREEN}[OK]${NC} Uploads directory exists"
fi
echo ""

# Set permissions
echo "Setting permissions..."
chmod +x start.sh 2>/dev/null || true
chmod +x check-status.sh 2>/dev/null || true
chmod 755 server/logs 2>/dev/null || true
chmod 755 uploads 2>/dev/null || true
echo -e "${GREEN}[OK]${NC} Permissions set"
echo ""

# Verify installation
echo "[8/8] Verifying installation..."
echo ""

# Check frontend node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}[OK]${NC} Frontend dependencies verified"
else
    echo -e "${RED}[FAIL]${NC} Frontend dependencies not found"
fi

# Check backend node_modules
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}[OK]${NC} Backend dependencies verified"
else
    echo -e "${RED}[FAIL]${NC} Backend dependencies not found"
fi

# Check .env file
if [ -f "server/.env" ]; then
    echo -e "${GREEN}[OK]${NC} Environment configuration verified"
else
    echo -e "${RED}[FAIL]${NC} Environment configuration not found"
fi

# Check responsive CSS
if [ -f "assets/css/responsive.css" ]; then
    echo -e "${GREEN}[OK]${NC} Responsive CSS verified"
else
    echo -e "${YELLOW}[WARN]${NC} Responsive CSS not found"
fi

echo ""
echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Installation Mode: $MODE"
echo ""
echo "Next steps:"
echo "  1. Review server/.env file and update if needed"
if [ "$MODE" = "production" ]; then
    echo "  2. Configure your database credentials in .env"
    echo "  3. Run: ./start.sh production"
    echo "  4. Configure nginx for production deployment"
    echo "  5. Access https://yourdomain.com in your browser"
else
    echo "  2. Run: ./start.sh development OR ./start.sh"
    echo "  3. Access http://localhost:3000 in your browser"
fi
echo ""
echo "Default Login Credentials:"
echo "  Admin: admin@swiftnexus.com / admin123"
echo ""
echo "Useful commands:"
echo "  ./start.sh development - Start development environment"
echo "  ./start.sh production  - Start production environment"
echo "  ./check-status.sh  - Check application status"
echo ""
echo "For more information, see SETUP.md"
echo ""
