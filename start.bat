@echo off
setlocal enabledelayedexpansion

REM SwiftNexus Enterprise - Enhanced Startup Script for Windows
REM Usage: start.bat [development|production]
REM Default: development

title SwiftNexus Enterprise - Startup Manager

echo ========================================
echo  SwiftNexus Enterprise - Enhanced Start
echo ========================================
echo.

REM Get environment mode
set MODE=development
if not "%1"=="" set MODE=%1
if "%MODE%"=="" set MODE=development

echo Starting Mode: %MODE%
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Node.js version...
node --version
echo.

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo [2/5] Installing frontend dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install frontend dependencies!
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/5] Frontend dependencies already installed
    echo.
)

if not exist "server\node_modules\" (
    echo [3/5] Installing backend dependencies...
    cd server
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install backend dependencies!
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo.
) else (
    echo [3/5] Backend dependencies already installed
    echo.
)

REM Check if .env file exists
if not exist "server\.env" (
    echo [WARNING] server\.env file not found!
    echo Creating default .env file...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=%MODE%
        echo.
        echo # JWT Secret ^(change this in production!^)
        echo JWT_SECRET=swiftnexus-secret-key-2024-change-this-in-production
        echo.
        echo # Frontend URL
        if "%MODE%"=="production" (
            echo FRONTEND_URL=https://yourdomain.com
            echo CORS_ORIGIN=https://yourdomain.com
        ) else (
            echo FRONTEND_URL=http://localhost:3000
            echo CORS_ORIGIN=http://localhost:3000
        )
        echo.
        echo # API Configuration
        echo API_VERSION=v1
    ) > server\.env
    echo .env file created successfully!
    echo.
) else (
    echo [OK] .env file exists, checking mode...
    findstr /C:"NODE_ENV=%MODE%" server\.env >nul
    if !ERRORLEVEL! NEQ 0 (
        echo [WARNING] .env file NODE_ENV does not match current mode!
        echo Current mode: %MODE%
        echo Please update server\.env NODE_ENV=%MODE%
        echo.
    )
)

REM Check if ports are already in use
echo [4/5] Checking if ports are available...
netstat -ano | findstr :5000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo WARNING: Port 5000 is already in use!
    echo Please close the application using this port or choose a different port.
    echo.
    set /p "continue=Do you want to continue anyway? (y/n): "
    if /i not "!continue!"=="y" (
        echo Startup cancelled.
        pause
        exit /b 1
    )
)

netstat -ano | findstr :3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo WARNING: Port 3000 is already in use!
    echo Please close the application using this port or choose a different port.
    echo.
    set /p "continue=Do you want to continue anyway? (y/n): "
    if /i not "!continue!"=="y" (
        echo Startup cancelled.
        pause
        exit /b 1
    )
)
echo Ports are available!
echo.

echo [5/5] Starting servers...
echo.

REM Create PID file directory
if not exist "temp\" mkdir temp

REM Kill any existing processes
if exist "temp\backend.pid" (
    set /p BACKEND_PID=<temp\backend.pid
    taskkill /PID !BACKEND_PID! /F >nul 2>nul
    del temp\backend.pid
)

if exist "temp\frontend.pid" (
    set /p FRONTEND_PID=<temp\frontend.pid
    taskkill /PID !FRONTEND_PID! /F >nul 2>nul
    del temp\frontend.pid
)

echo ========================================
echo  Starting Backend Server (Port 5000)
echo ========================================
echo.

REM Start backend server in new window with colored title
start "SwiftNexus Backend [PORT 5000]" cmd /k "color 0A && cd /d %~dp0server && echo Backend Server Starting... && echo. && npm start"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo ========================================
echo  Starting Frontend Server (Port 3000)
echo ========================================
echo.

REM Start frontend server in new window with colored title
start "SwiftNexus Frontend [PORT 3000]" cmd /k "color 0B && cd /d %~dp0 && echo Frontend Server Starting... && echo. && npm run dev"

echo.
echo ========================================
echo  SwiftNexus Enterprise is starting...
echo ========================================
echo.
echo Mode: %MODE%
echo Backend Server:  http://localhost:5000
echo Frontend App:    http://localhost:3000
echo API Endpoint:    http://localhost:5000/api
if "%MODE%"=="production" (
    echo Production URLs:
    echo   Admin: https://yourdomain.com/admin
    echo   Login: https://yourdomain.com/login
) else (
    echo Development URLs:
    echo   Login Page:      http://localhost:3000/pages/login
)
echo.
echo Default Login Credentials:
echo   ┌──────────────────────────────────┐
echo   │ Admin: admin@swiftnexus.com / admin123          │
echo   └──────────────────────────────────┘
echo.
echo Two command windows have been opened:
echo   1. Backend Server (Green background)
echo   2. Frontend Server (Cyan background)
echo.
echo To stop servers:
echo   - Close each server window, OR
echo   - Press Ctrl+C in each window
echo.
echo Waiting 5 seconds before opening browser...
timeout /t 5 /nobreak >nul

REM Open browser
echo Opening browser...
start http://localhost:3000
echo.

echo ========================================
echo  Servers are running!
echo ========================================
echo.
echo You can now close this window.
echo The servers will continue running in their own windows.
echo.
echo To monitor the servers, check their respective windows.
echo.

REM Ask if user wants to keep this window open
set /p "keepopen=Keep this window open for monitoring? (y/n): "
if /i "!keepopen!"=="y" (
    echo.
    echo Monitoring mode enabled.
    echo This window will stay open for logging.
    echo Press Ctrl+C to stop monitoring ^(servers will continue^).
    echo.
    echo Latest status:
    echo ---------------

    REM Simple monitoring loop
    :monitor
    timeout /t 10 /nobreak >nul
    echo [%date% %time%] Servers are running...

    REM Check if backend is still running
    netstat -ano | findstr :5000 >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Backend server appears to be down!
    )

    REM Check if frontend is still running
    netstat -ano | findstr :3000 >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Frontend server appears to be down!
    )

    goto monitor
) else (
    echo.
    echo Startup complete!
    echo Check the server windows for logs and status.
    echo.
    timeout /t 2 /nobreak >nul
    exit /b 0
)
