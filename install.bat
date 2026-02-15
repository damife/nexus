@echo off
setlocal enabledelayedexpansion

REM SwiftNexus Enterprise - Installation Script for Windows
REM Usage: install.bat [development|production]
REM Default: development

title SwiftNexus Enterprise - Installation

echo ========================================
echo  SwiftNexus Enterprise - Installation
echo ========================================
echo.

REM Get environment mode
set MODE=development
if not "%1"=="" set MODE=%1
if "%MODE%"=="" set MODE=development

echo Installation Mode: %MODE%
echo.

REM Check if Node.js is installed
echo [1/8] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from https://nodejs.org/
    echo After installation, run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

REM Check npm
echo [2/8] Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: npm is not installed!
    echo npm should come with Node.js installation.
    echo Please reinstall Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] npm is installed
npm --version
echo.

REM Clean old installations
echo [3/8] Cleaning old installations...
if exist "node_modules\" (
    echo Removing old frontend dependencies...
    rmdir /s /q node_modules
)
if exist "package-lock.json" (
    del /q package-lock.json
)
if exist "server\node_modules\" (
    echo Removing old backend dependencies...
    rmdir /s /q server\node_modules
)
if exist "server\package-lock.json" (
    del /q server\package-lock.json
)
echo [OK] Cleanup complete
echo.

REM Install frontend dependencies
echo [4/8] Installing frontend dependencies...
echo This may take a few minutes...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install frontend dependencies!
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

REM Install backend dependencies
echo [5/8] Installing backend dependencies...
echo This may take a few minutes...
echo.
cd server
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install backend dependencies!
    echo Please check your internet connection and try again.
    echo.
    cd ..
    pause
    exit /b 1
)
cd ..
echo [OK] Backend dependencies installed
echo.

REM Create .env file if it doesn't exist
echo [6/8] Configuring environment variables...
if not exist "server\.env" (
    echo Creating .env file...
    (
        echo # SwiftNexus Enterprise - Environment Configuration
        echo # Generated on %date% %time%
        echo.
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=%MODE%
        echo.
        echo # JWT Secret ^(CHANGE THIS IN PRODUCTION!^)
        echo JWT_SECRET=swiftnexus-secret-key-2024-change-this-in-production-%RANDOM%
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
        echo.
        echo # Database Configuration ^(Required for production^)
        if "%MODE%"=="production" (
            echo DB_HOST=localhost
            echo DB_PORT=5432
            echo DB_NAME=swiftnexus
            echo DB_USER=postgres
            echo DB_PASSWORD=your_secure_password
        ) else (
            echo # DB_HOST=localhost
            echo # DB_PORT=5432
            echo # DB_NAME=swiftnexus
            echo # DB_USER=postgres
            echo # DB_PASSWORD=your_password
        )
        echo.
        echo # Security
        echo BCRYPT_ROUNDS=10
        echo JWT_EXPIRES_IN=24h
        if "%MODE%"=="production" (
            echo # Production Settings
            echo LOG_LEVEL=warn
            echo RATE_LIMIT_WINDOW=15
            echo RATE_LIMIT_MAX=100
        )
    ) > server\.env
    echo [OK] .env file created
) else (
    echo [OK] .env file already exists
)
echo.

REM Create logs directory
echo [7/8] Creating necessary directories...
if not exist "server\logs\" (
    mkdir server\logs
    echo [OK] Logs directory created
) else (
    echo [OK] Logs directory exists
)
if not exist "uploads\" (
    mkdir uploads
    echo [OK] Uploads directory created
) else (
    echo [OK] Uploads directory exists
)
echo.

REM Verify installation
echo [8/8] Verifying installation...
echo.

REM Check frontend node_modules
if exist "node_modules\" (
    echo [OK] Frontend dependencies verified
) else (
    echo [FAIL] Frontend dependencies not found
)

REM Check backend node_modules
if exist "server\node_modules\" (
    echo [OK] Backend dependencies verified
) else (
    echo [FAIL] Backend dependencies not found
)

REM Check .env file
if exist "server\.env" (
    echo [OK] Environment configuration verified
) else (
    echo [FAIL] Environment configuration not found
)

REM Check responsive CSS
if exist "assets\css\responsive.css" (
    echo [OK] Responsive CSS verified
) else (
    echo [WARN] Responsive CSS not found
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Installation Mode: %MODE%
echo.
echo Next steps:
echo   1. Review server\.env file and update if needed
if "%MODE%"=="production" (
echo   2. Configure your database credentials in .env
echo   3. Run: start.bat production
echo   4. Configure nginx for production deployment
echo   5. Access https://yourdomain.com in your browser
) else (
echo   2. Run: start.bat development OR start.bat
echo   3. Access http://localhost:3000 in your browser
)
echo.
echo Default Login Credentials:
echo   Admin: admin@swiftnexus.com / admin123
echo.
echo Useful commands:
echo   start.bat development - Start development environment
echo   start.bat production  - Start production environment
echo   check-status.bat    - Check application status
echo.
echo For more information, see SETUP.md
echo.
pause
