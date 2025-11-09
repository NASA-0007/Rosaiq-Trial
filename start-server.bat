@echo off
REM RosaIQ Air Quality Server - Windows Startup Script

echo.
echo ============================================================
echo   RosaIQ Air Quality Server - Starting...
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

REM Check if in correct directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the custom-server directory!
    echo.
    echo Current directory: %CD%
    echo Expected: ...\arduino\custom-server
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies for the first time...
    echo This may take a minute...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [SUCCESS] Dependencies installed!
    echo.
)

REM Start the server
echo [INFO] Starting RosaIQ Air Quality Server...
echo.
echo ============================================================
echo   Press Ctrl+C to stop the server
echo ============================================================
echo.

node server.js

REM If server stops
echo.
echo ============================================================
echo   Server stopped
echo ============================================================
echo.
pause
