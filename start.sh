#!/bin/bash

# SwiftNexus Enterprise - Enhanced Startup Script for Linux/macOS
# Usage: ./start.sh [development|production]
# Default: development

echo "========================================"
echo " SwiftNexus Enterprise - Enhanced Start"
echo "========================================"
echo ""

# Get environment mode
MODE="${1:-development}"
echo "Starting Mode: $MODE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}[1/5]${NC} Checking Node.js version..."
node --version
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[2/5]${NC} Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install frontend dependencies!${NC}"
        exit 1
    fi
    echo ""
else
    echo -e "${GREEN}[2/5]${NC} Frontend dependencies already installed"
    echo ""
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}[3/5]${NC} Installing backend dependencies..."
    cd server
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Failed to install backend dependencies!${NC}"
        cd ..
        exit 1
    fi
    cd ..
    echo ""
else
    echo -e "${GREEN}[3/5]${NC} Backend dependencies already installed"
    echo ""
fi

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}[WARNING]${NC} server/.env file not found!"
    echo "Creating default .env file..."
    cat > server/.env << 'EOF'
# Server Configuration
PORT=5000
NODE_ENV=$MODE

# JWT Secret (change this in production!)
JWT_SECRET=swiftnexus-secret-key-2024-change-this-in-production

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

# CORS Configuration
CORS_ORIGIN=$CORS_ORIGIN

# Security
BCRYPT_ROUNDS=10
JWT_EXPIRES_IN=24h
EOF
    echo -e "${GREEN}.env file created successfully!${NC}"
    echo ""
else
    echo -e "${GREEN}[OK]${NC} .env file exists, checking mode..."
    if ! grep -q "NODE_ENV=$MODE" server/.env; then
        echo -e "${YELLOW}[WARNING]${NC} .env file NODE_ENV does not match current mode!"
        echo "Current mode: $MODE"
        echo "Please update server/.env NODE_ENV=$MODE"
        echo ""
    fi
fi

# Check if ports are available
echo -e "${BLUE}[4/5]${NC} Checking if ports are available..."

# Check backend (port 5000)
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":5000.*LISTEN"; then
    echo -e "${YELLOW}WARNING: Port 5000 is already in use!${NC}"
    echo "Please close the application using this port or choose a different port."
    echo ""
    read -p "Do you want to continue anyway? (y/n): " continue
    if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
        echo "Startup cancelled."
        exit 1
    fi
fi

# Check frontend (port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":3000.*LISTEN"; then
    echo -e "${YELLOW}WARNING: Port 3000 is already in use!${NC}"
    echo "Please close the application using this port or choose a different port."
    echo ""
    read -p "Do you want to continue anyway? (y/n): " continue
    if [ "$continue" != "y" ] && [ "$continue" != "Y" ]; then
        echo "Startup cancelled."
        exit 1
    fi
fi
echo -e "${GREEN}Ports are available!${NC}"
echo ""

echo -e "${BLUE}[5/5]${NC} Starting servers..."
echo ""

# Create a trap to kill all child processes on exit
trap 'echo ""; echo "Shutting down servers..."; kill $(jobs -p) 2>/dev/null; echo "Goodbye!"; exit' INT TERM EXIT

echo "========================================"
echo " Starting Backend Server (Port 5000)"
echo "========================================"
echo ""

# Start backend server in background
cd server
npm start &
BACKEND_PID=$!
cd ..

echo -e "${GREEN}Backend server starting...${NC} (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to start
echo "Waiting for backend to initialize..."
sleep 3
echo ""

echo "========================================"
echo " Starting Frontend Server (Port 3000)"
echo "========================================"
echo ""

# Start frontend server in background
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}Frontend server starting...${NC} (PID: $FRONTEND_PID)"
echo ""

# Wait a bit for frontend to start
echo "Waiting for frontend to initialize..."
sleep 3
echo ""

echo "========================================"
echo " SwiftNexus Enterprise is running!"
echo "========================================"
echo ""
echo "Mode: $MODE"
echo -e "${CYAN}Backend Server:${NC}  http://localhost:5000"
echo -e "${CYAN}Frontend App:${NC}    http://localhost:3000"
echo -e "${CYAN}API Endpoint:${NC}    http://localhost:5000/api"
if [ "$MODE" = "production" ]; then
    echo "Production URLs:"
    echo "  Admin: https://yourdomain.com/admin"
    echo "  Login: https://yourdomain.com/login"
else
    echo "Development URLs:"
    echo "  Login Page:      http://localhost:3000/pages/login"
fi
echo ""
echo "Default Login Credentials:"
echo "  ┌──────────────────────────────────┐"
echo "  │ Admin: admin@swiftnexus.com / admin123          │"
echo "  └──────────────────────────────────┘"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""
echo "Opening browser in 3 seconds..."
sleep 3

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 &>/dev/null &
elif command -v open &> /dev/null; then
    open http://localhost:3000 &>/dev/null &
elif command -v sensible-browser &> /dev/null; then
    sensible-browser http://localhost:3000 &>/dev/null &
else
    echo "Could not auto-open browser. Please navigate to http://localhost:3000"
fi

echo ""
echo "========================================="
echo " Servers are running!"
echo "========================================="
echo ""
echo "Monitoring mode enabled..."
echo "Server status will be checked every 30 seconds."
echo ""

# Simple monitoring loop
COUNT=0
while true; do
    sleep 30
    COUNT=$((COUNT + 1))

    # Check if backend is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}[ERROR] Backend server has stopped!${NC}"
        break
    fi

    # Check if frontend is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}[ERROR] Frontend server has stopped!${NC}"
        break
    fi

    # Show periodic status
    if [ $((COUNT % 2)) -eq 0 ]; then
        echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} Servers are running... ($(($COUNT * 30))s elapsed)"
    fi
done

# Wait for user interrupt (this line will be reached if servers crash)
wait
