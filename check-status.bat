@echo off
echo ========================================
echo  SwiftNexus Enterprise - Status Check
echo ========================================
echo.

REM Check Node.js
echo [1/6] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js is installed
    node --version
) else (
    echo [FAIL] Node.js is NOT installed
    echo Please install from https://nodejs.org/
)
echo.

REM Check npm
echo [2/6] Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] npm is installed
    npm --version
) else (
    echo [FAIL] npm is NOT installed
)
echo.

REM Check frontend dependencies
echo [3/6] Checking frontend dependencies...
if exist "node_modules\" (
    echo [OK] Frontend dependencies installed
) else (
    echo [FAIL] Frontend dependencies NOT installed
    echo Run: npm install
)
echo.

REM Check backend dependencies
echo [4/6] Checking backend dependencies...
if exist "server\node_modules\" (
    echo [OK] Backend dependencies installed
) else (
    echo [FAIL] Backend dependencies NOT installed
    echo Run: cd server && npm install
)
echo.

REM Check .env file
echo [5/6] Checking .env configuration...
if exist "server\.env" (
    echo [OK] .env file exists
) else (
    echo [WARN] .env file NOT found
    echo Default configuration will be used
)
echo.

REM Check if servers are running
echo [6/6] Checking if servers are running...
netstat -ano | findstr :5000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Backend server is running on port 5000
) else (
    echo [INFO] Backend server is NOT running
    echo Run: cd server && npm start
)

netstat -ano | findstr :3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Frontend server is running on port 3000
) else (
    echo [INFO] Frontend server is NOT running
    echo Run: npm run dev
)
echo.

REM Check responsive.css
echo [BONUS] Checking responsive CSS...
if exist "assets\css\responsive.css" (
    echo [OK] Responsive CSS file exists
) else (
    echo [WARN] Responsive CSS file NOT found
)
echo.

echo ========================================
echo  Status Check Complete
echo ========================================
echo.
echo To start the application:
echo   Option 1: Run start.bat
echo   Option 2: Manually start both servers
echo.
echo To access the application:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000/api
echo   Login:    http://localhost:3000/pages/login
echo.
echo Default Credentials:
echo   Admin: admin / password
echo   User:  user / password
echo.
pause
