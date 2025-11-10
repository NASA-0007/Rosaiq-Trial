#!/bin/bash

# RosaIQ Server Quick Test Script
# Tests server locally before deploying to Render

echo "🧪 Testing RosaIQ Air Quality Server..."
echo ""

# Check Node.js version
echo "1️⃣  Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "   Node.js version: $NODE_VERSION"

if [ $? -ne 0 ]; then
    echo "   ❌ Node.js not found! Please install Node.js 18 or higher."
    exit 1
fi

# Install dependencies
echo ""
echo "2️⃣  Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "   ❌ Failed to install dependencies!"
    exit 1
fi

echo "   ✅ Dependencies installed"

# Test database initialization
echo ""
echo "3️⃣  Testing database initialization..."
node -e "const db = require('./database'); if(db.initialize()) { console.log('   ✅ Database test passed'); process.exit(0); } else { console.log('   ❌ Database test failed'); process.exit(1); }"

if [ $? -ne 0 ]; then
    echo "   ❌ Database initialization failed!"
    exit 1
fi

# Start server in background
echo ""
echo "4️⃣  Starting server..."
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test server health
echo ""
echo "5️⃣  Testing server health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Server is running!"
else
    echo "   ❌ Server health check failed! (HTTP $HTTP_CODE)"
    kill $SERVER_PID
    exit 1
fi

# Test API endpoint
echo ""
echo "6️⃣  Testing API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/devices)

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ API is responding!"
else
    echo "   ❌ API test failed! (HTTP $HTTP_CODE)"
    kill $SERVER_PID
    exit 1
fi

# Stop server
echo ""
echo "7️⃣  Stopping test server..."
kill $SERVER_PID
echo "   ✅ Server stopped"

echo ""
echo "============================================"
echo "✨ All tests passed! Server is ready!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub"
echo "2. Follow instructions in RENDER_DEPLOYMENT.md"
echo "3. Deploy to Render!"
echo ""
