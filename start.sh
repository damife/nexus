#!/bin/bash

# SwiftNexus Enterprise - Startup Script for Linux/macOS
#
# Usage: ./start.sh [development|production] [background]
#   development|production - Run mode (default: development)
#   background|daemon      - Run in background (survives SSH disconnect)
# Example: ./start.sh production background
#
# Ports (must match nginx.conf):
#   - Backend:  5000 (API, /secure/secure.js, SPA fallback for /install, /swiftadmin, etc.)
#   - Frontend: 3001 (Vite dev server - marketing pages, static assets)
#
# Requires: server/.env with DB_*, JWT_SECRET, CORS_ORIGIN
# Production: Set CORS_ORIGIN=https://swiftnexus.org in server/.env
#
# If ports 5000/3001 are busy, you are asked: kill the service? (y/n)
# Non-interactive (e.g. SSH one-liner): START_SH_KILL_PORTS=yes ./start.sh production

echo "========================================"
echo " SwiftNexus Enterprise - Enhanced Start"
echo "========================================"
echo ""

# Get environment mode and optional background flag
MODE="${1:-development}"
BACKGROUND="${2:-}"

# If "background" or "daemon" requested, re-exec under nohup and exit
if [ "$BACKGROUND" = "background" ] || [ "$BACKGROUND" = "daemon" ]; then
    LOG_FILE="${START_SH_LOG:-swiftnexus.log}"
    echo "Starting SwiftNexus in background (mode: $MODE)..."
    nohup "$0" "$MODE" </dev/null >> "$LOG_FILE" 2>&1 &
    DAEMON_PID=$!
    echo -e "${GREEN}SwiftNexus started in background. PID: $DAEMON_PID${NC}"
    echo "Log file: $LOG_FILE"
    echo "To stop: pkill -f 'node server.js'; pkill -f 'vite'"
    exit 0
fi

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
    echo "Creating default .env..."
    [ "$MODE" = "production" ] && CORS_VAL="https://swiftnexus.org" || CORS_VAL="http://localhost:3001"
    cat > server/.env << EOF
# Server Configuration
PORT=5000
NODE_ENV=$MODE

# Database (REQUIRED - edit these!)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swiftnexus
DB_USER=postgres
DB_PASSWORD=change_me

# JWT (REQUIRED - use 32+ chars in production)
JWT_SECRET=swiftnexus-secret-key-2024-change-this-in-production

# CORS (frontend URL - matches nginx proxy)
CORS_ORIGIN=$CORS_VAL

# Security
BCRYPT_ROUNDS=10
JWT_EXPIRES_IN=24h
EOF
    echo -e "${YELLOW}Please edit server/.env and set DB_PASSWORD, JWT_SECRET, and other required values.${NC}"
    echo -e "${GREEN}.env file created.${NC}"
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

# --- Port helpers: detect listeners, optionally kill with yes/no ---
# Match exact port (avoid :5000 matching :50001)
_port_grep_pattern() {
    echo ":${1}([^0-9]|\$)"
}

port_is_in_use() {
    local port=$1
    local pat
    pat=$(_port_grep_pattern "$port")
    if command -v lsof >/dev/null 2>&1 && lsof -Pi :"${port}" -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    fi
    if command -v ss >/dev/null 2>&1 && ss -tlnp 2>/dev/null | grep -qE "$pat"; then
        return 0
    fi
    if netstat -an 2>/dev/null | grep "LISTEN" | grep -qE "$pat"; then
        return 0
    fi
    return 1
}

# Print PIDs listening on TCP port (one per line)
get_listen_pids_on_port() {
    local port=$1
    local pids=""
    if command -v lsof >/dev/null 2>&1; then
        pids=$(lsof -ti :"${port}" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')
    fi
    if [ -z "$pids" ] && command -v ss >/dev/null 2>&1; then
        pids=$(ss -tlnp 2>/dev/null | grep -E "$(_port_grep_pattern "$port")" | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | sort -u | tr '\n' ' ')
    fi
    echo "$pids" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u
}

show_port_listeners() {
    local port=$1
    echo -e "${CYAN}Processes using port ${port}:${NC}"
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :"${port}" -sTCP:LISTEN -n -P 2>/dev/null || true
    fi
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep -E "$(_port_grep_pattern "$port")" || true
    fi
}

kill_listeners_on_port() {
    local port=$1
    local pids
    pids=$(get_listen_pids_on_port "$port")
    if [ -z "$pids" ]; then
        echo -e "${YELLOW}Could not resolve PIDs for port ${port}; trying fuser...${NC}"
        if command -v fuser >/dev/null 2>&1; then
            fuser -k "${port}/tcp" 2>/dev/null || true
        fi
        sleep 1
        return 0
    fi
    for pid in $pids; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "  Sending SIGTERM to PID $pid ..."
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done
    sleep 2
    # Still listening? force kill
    if port_is_in_use "$port"; then
        for pid in $pids; do
            if kill -0 "$pid" 2>/dev/null; then
                echo "  Sending SIGKILL to PID $pid ..."
                kill -KILL "$pid" 2>/dev/null || true
            fi
        done
        sleep 1
    fi
}

# Ask to kill service on port, or auto-kill if START_SH_KILL_PORTS=yes (non-interactive)
resolve_port_conflict() {
    local port=$1
    local label=$2

    if ! port_is_in_use "$port"; then
        return 0
    fi

    echo -e "${YELLOW}WARNING: Port ${port} (${label}) is already in use.${NC}"
    show_port_listeners "$port"
    echo ""

    local kill_choice=""
    if [ "${START_SH_KILL_PORTS:-}" = "yes" ] || [ "${START_SH_KILL_PORTS:-}" = "y" ]; then
        kill_choice="y"
        echo -e "${CYAN}START_SH_KILL_PORTS=yes — killing listener(s) on port ${port}.${NC}"
    elif [ -t 0 ]; then
        read -p "Kill the service(s) on port ${port} and continue? (y/n): " kill_choice
    else
        echo -e "${RED}No TTY. Set START_SH_KILL_PORTS=yes to auto-kill, or free port ${port} manually.${NC}"
        exit 1
    fi

    if [ "$kill_choice" = "y" ] || [ "$kill_choice" = "Y" ]; then
        kill_listeners_on_port "$port"
        if port_is_in_use "$port"; then
            echo -e "${RED}Port ${port} is still in use after kill attempt. Exiting.${NC}"
            exit 1
        fi
        echo -e "${GREEN}Port ${port} is now free.${NC}"
    else
        echo "Startup cancelled (port ${port} left in use)."
        exit 1
    fi
    echo ""
}

# Production: install deps and build frontend so backend can serve React app at /install, /swiftadmin
if [ "$MODE" = "production" ]; then
    echo -e "${BLUE}[4/5]${NC} Ensuring frontend and backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Frontend npm install failed!${NC}"
        exit 1
    fi
    (cd server && npm install)
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Backend npm install failed!${NC}"
        exit 1
    fi
    echo -e "${BLUE}Building frontend (required for /install, /swiftadmin)...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Frontend build failed!${NC}"
        exit 1
    fi
    echo -e "${GREEN}Frontend built successfully.${NC}"
    echo ""
fi

# Check if ports are available (or kill listeners after confirmation)
echo -e "${BLUE}[5/5]${NC} Checking if ports are available..."

resolve_port_conflict 5000 "backend API"
resolve_port_conflict 3001 "frontend (Vite)"

echo -e "${GREEN}Ports are available!${NC}"
echo ""

echo -e "${BLUE}Starting servers...${NC}"
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
echo " Starting Frontend Server (Port 3001)"
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
echo -e "${CYAN}Frontend App:${NC}    http://localhost:3001"
echo -e "${CYAN}API Endpoint:${NC}    http://localhost:5000/api"
if [ "$MODE" = "production" ]; then
    echo "Production URLs:"
    echo "  Site:   https://swiftnexus.org"
    echo "  Admin:  https://swiftnexus.org/swiftadmin/admin/dashboard"
    echo "  Login:  https://swiftnexus.org/pages/login"
    echo "  Install: https://swiftnexus.org/install"
else
    echo "Development URLs:"
    echo "  Login Page:      http://localhost:3001/pages/login"
    echo "  Install:         http://localhost:3001/install"
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

# Try to open browser (skip on headless/SSH)
if [ -t 0 ] && [ -n "$DISPLAY" ] 2>/dev/null; then
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3001 &>/dev/null &
    elif command -v open &> /dev/null; then
        open http://localhost:3001 &>/dev/null &
    elif command -v sensible-browser &> /dev/null; then
        sensible-browser http://localhost:3001 &>/dev/null &
    else
        echo "Open in browser: http://localhost:3001"
    fi
else
    echo "Open in browser: http://localhost:3001 (or https://swiftnexus.org if production)"
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
