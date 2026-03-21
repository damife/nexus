#!/bin/bash

# SwiftNexus Enterprise - Enhanced Status Check Script for Linux/macOS
# Usage: ./checkStatus.sh [development|production]
# Default: development

echo "========================================"
echo " SwiftNexus Enterprise - Enhanced Status Check"
echo "========================================"
echo ""

# Get environment mode
MODE="${1:-development}"
echo "Checking Mode: $MODE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo "[1/6] Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} Node.js is installed"
    node --version
else
    echo -e "${RED}[FAIL]${NC} Node.js is NOT installed"
    echo "Please install from https://nodejs.org/"
fi
echo ""

# Check npm
echo "[2/6] Checking npm installation..."
if command -v npm &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} npm is installed"
    npm --version
else
    echo -e "${RED}[FAIL]${NC} npm is NOT installed"
fi
echo ""

# Check .env file
echo "[3/7] Checking environment configuration..."
if [ -f "server/.env" ]; then
    echo -e "${GREEN}[OK]${NC} .env file exists"
    
    # Check if NODE_ENV matches current mode
    if grep -q "NODE_ENV=$MODE" server/.env; then
        echo -e "${GREEN}[OK]${NC} NODE_ENV matches current mode: $MODE"
    else
        echo -e "${YELLOW}[WARNING]${NC} NODE_ENV in .env doesn't match current mode"
        echo "Current mode: $MODE"
        echo "Please update server/.env NODE_ENV=$MODE"
    fi
    
    # Check database configuration for production
    if [ "$MODE" = "production" ]; then
        if grep -q "^DB_HOST=" server/.env && ! grep -q "^# DB_HOST=" server/.env; then
            echo -e "${GREEN}[OK]${NC} Database configuration found for production"
        else
            echo -e "${YELLOW}[WARNING]${NC} Database configuration missing for production"
        fi
    fi
else
    echo -e "${RED}[FAIL]${NC} .env file NOT found"
    echo "Run: ./install.sh $MODE to create it"
fi
echo ""

# Check database connection
echo "[4/7] Checking database connection..."
if [ "$MODE" = "production" ]; then
    if [ -f "server/.env" ]; then
        # Extract database config from .env
        DB_HOST=$(grep "^DB_HOST=" server/.env | cut -d'=' -f2)
        DB_NAME=$(grep "^DB_NAME=" server/.env | cut -d'=' -f2)
        DB_USER=$(grep "^DB_USER=" server/.env | cut -d'=' -f2)
        
        if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
            # Test database connection
            if command -v psql &> /dev/null; then
                if PGPASSWORD=$(grep "^DB_PASSWORD=" server/.env | cut -d'=' -f2) psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null; then
                    echo -e "${GREEN}[OK]${NC} Database connection successful"
                else
                    echo -e "${YELLOW}[WARNING]${NC} Database connection failed"
                    echo "Check database credentials and service status"
                fi
            else
                echo -e "${BLUE}[INFO]${NC} PostgreSQL client not installed, skipping connection test"
            fi
        else
            echo -e "${YELLOW}[WARNING]${NC} Database configuration incomplete"
        fi
    else
        echo -e "${YELLOW}[INFO]${NC} Skipping database check in development mode"
    fi
else
    echo -e "${BLUE}[INFO]${NC} Database check not required for development mode"
fi
echo ""

# Check frontend dependencies
echo "[5/7] Checking frontend dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}[OK]${NC} Frontend dependencies installed"
else
    echo -e "${RED}[FAIL]${NC} Frontend dependencies NOT installed"
    echo "Run: npm install"
fi
echo ""

# Check backend dependencies
echo "[6/8] Checking backend dependencies..."
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}[OK]${NC} Backend dependencies installed"
else
    echo -e "${RED}[FAIL]${NC} Backend dependencies NOT installed"
    echo "Run: cd server && npm install"
fi
echo ""

# Check backend (port 5000)
echo "[7/8] Checking backend server..."
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":5000.*LISTEN"; then
    echo -e "${GREEN}[OK]${NC} Backend server is running on port 5000"
else
    echo -e "${BLUE}[INFO]${NC} Backend server is NOT running"
    echo "Run: ./start.sh $MODE"
fi

# Check frontend (port 3001)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":3001.*LISTEN"; then
    echo -e "${GREEN}[OK]${NC} Frontend server is running on port 3001"
else
    echo -e "${BLUE}[INFO]${NC} Frontend server is NOT running"
    echo "Run: ./start.sh $MODE"
fi
echo ""

# Check responsive.css
echo "[8/8] Checking responsive CSS..."
if [ -f "assets/css/responsive.css" ]; then
    echo -e "${GREEN}[OK]${NC} Responsive CSS file exists"
else
    echo -e "${YELLOW}[WARN]${NC} Responsive CSS file NOT found"
fi
echo ""

echo "========================================"
echo " Enhanced Status Check Complete"
echo "========================================"
echo ""
echo "Mode: $MODE"
echo ""
echo "To start application:"
echo "  ./start.sh $MODE - Start in $MODE mode"
echo "  ./install.sh $MODE - Install for $MODE mode"
echo "  sudo ./nginxsetup.sh - Setup Nginx"
echo ""
echo "To access application:"
if [ "$MODE" = "production" ]; then
    echo "  Production URLs:"
    echo "    Frontend: https://yourdomain.com"
    echo "    Admin:    https://yourdomain.com/admin"
    echo "    Login:    https://yourdomain.com/login"
    echo "    API:      https://yourdomain.com/api"
else
    echo "  Development URLs:"
    echo "    Frontend: http://localhost:3001"
    echo "    Backend:  http://localhost:5000/api"
    echo "    Login:    http://localhost:3001/pages/login"
    echo "    Admin:    http://localhost:3001/swiftadmin/admin/dashboard"
fi
echo ""
echo "Default Login Credentials:"
echo "  Admin: admin@swiftnexus.com / admin123"
echo ""
echo "Useful Commands:"
echo "  ./checkStatus.sh development - Check development status"
echo "  ./checkStatus.sh production  - Check production status"
echo "  ./start.sh $MODE - Start application"
echo "  ./install.sh $MODE - Reinstall application"
echo ""
