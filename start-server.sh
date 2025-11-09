#!/bin/bash
# RosaIQ Air Quality Server - Linux/Mac Startup Script

echo ""
echo "============================================================"
echo "  RosaIQ Air Quality Server - Starting..."
echo "============================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Please install Node.js:"
    echo "  - Mac: brew install node"
    echo "  - Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  - Other: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[INFO] Node.js version:"
node --version
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "[ERROR] Please run this script from the custom-server directory!"
    echo ""
    echo "Current directory: $(pwd)"
    echo "Expected: .../arduino/custom-server"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies for the first time..."
    echo "This may take a minute..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install dependencies!"
        echo ""
        exit 1
    fi
    echo ""
    echo "[SUCCESS] Dependencies installed!"
    echo ""
fi

# Start the server
echo "[INFO] Starting RosaIQ Air Quality Server..."
echo ""
echo "============================================================"
echo "  Press Ctrl+C to stop the server"
echo "============================================================"
echo ""

node server.js

# If server stops
echo ""
echo "============================================================"
echo "  Server stopped"
echo "============================================================"
echo ""
