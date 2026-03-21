#!/bin/bash

# SwiftNexus Enterprise - Comprehensive Health Check
# Checks server processes, disk, memory, key files, database, API, nginx
# Usage: ./healthCheck.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok() { echo -e "${GREEN}[OK]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "SwiftNexus Enterprise - Health Check"
echo "===================================="

# 1. Backend (port 5000)
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 || (command -v netstat &>/dev/null && netstat -an 2>/dev/null | grep -q ":5000.*LISTEN"); then
  ok "Backend running on port 5000"
else
  fail "Backend NOT running on port 5000"
fi

# 2. Frontend (port 3001)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 || (command -v netstat &>/dev/null && netstat -an 2>/dev/null | grep -q ":3001.*LISTEN"); then
  ok "Frontend running on port 3001"
else
  fail "Frontend NOT running on port 3001"
fi

# 3. API health
if command -v curl &>/dev/null; then
  if curl -sf --connect-timeout 3 "http://localhost:5000/api/health" >/dev/null 2>&1; then
    ok "API health endpoint responding"
  else
    fail "API health endpoint not responding"
  fi
else
  info "curl not found, skipping API check"
fi

# 4. Key files
for f in server/.env package.json server/package.json server/server.js; do
  [ -f "$f" ] && ok "File: $f" || fail "Missing: $f"
done

# 5. Dependencies
[ -d "node_modules" ] && ok "Frontend node_modules present" || fail "Frontend node_modules missing"
[ -d "server/node_modules" ] && ok "Backend node_modules present" || fail "Backend node_modules missing"

# 6. Production build
[ -d "dist" ] && [ -f "dist/app.html" ] && ok "Production build present" || warn "Production build missing (npm run build)"

# 7. Disk & memory (Linux)
if command -v df &>/dev/null; then
  USAGE=$(df -h . 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
  [ -n "$USAGE" ] && { [ "$USAGE" -lt 90 ] && ok "Disk: ${USAGE}%" || warn "Disk high: ${USAGE}%"; }
fi
if [ -f /proc/meminfo ] 2>/dev/null; then
  MEMTOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  MEMAVAIL=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
  [ -n "$MEMTOTAL" ] && [ -n "$MEMAVAIL" ] && [ "$MEMTOTAL" -gt 0 ] && {
    PCT=$(( (MEMTOTAL - MEMAVAIL) * 100 / MEMTOTAL ))
    [ "$PCT" -lt 90 ] && ok "Memory: ~${PCT}%" || warn "Memory high: ~${PCT}%"
  }
fi

# 8. Database
if [ -f "server/.env" ] && command -v psql &>/dev/null; then
  DB_HOST=$(grep "^DB_HOST=" server/.env 2>/dev/null | cut -d'=' -f2)
  DB_NAME=$(grep "^DB_NAME=" server/.env 2>/dev/null | cut -d'=' -f2)
  DB_USER=$(grep "^DB_USER=" server/.env 2>/dev/null | cut -d'=' -f2)
  if [ -n "$DB_HOST" ] && [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
    PGPASSWORD=$(grep "^DB_PASSWORD=" server/.env 2>/dev/null | cut -d'=' -f2) psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null && ok "Database OK" || fail "Database connection failed"
  fi
fi

# 9. Nginx
command -v nginx &>/dev/null && systemctl is-active nginx &>/dev/null 2>&1 && ok "Nginx running" || true

echo ""
info "Admin UI health: /swiftadmin/admin/health (detailed system health)"
