# RosaIQ Server Quick Test Script
# Tests server locally before deploying to Render

Write-Host "🧪 Testing RosaIQ Air Quality Server..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "1️⃣  Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "   Node.js version: $nodeVersion" -ForegroundColor Green

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Node.js not found! Please install Node.js 18 or higher." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "2️⃣  Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}

Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Test database initialization
Write-Host ""
Write-Host "3️⃣  Testing database initialization..." -ForegroundColor Yellow
node -e "const db = require('./database'); if(db.initialize()) { console.log('   ✅ Database test passed'); process.exit(0); } else { console.log('   ❌ Database test failed'); process.exit(1); }"

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Database initialization failed!" -ForegroundColor Red
    exit 1
}

# Start server in background
Write-Host ""
Write-Host "4️⃣  Starting server..." -ForegroundColor Yellow
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

# Wait for server to start
Start-Sleep -Seconds 3

# Test server health
Write-Host ""
Write-Host "5️⃣  Testing server health..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Server is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Server health check failed!" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force
    exit 1
}

# Test API endpoint
Write-Host ""
Write-Host "6️⃣  Testing API endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/devices" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ API is responding!" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ API test failed!" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force
    exit 1
}

# Stop server
Write-Host ""
Write-Host "7️⃣  Stopping test server..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -Force
Write-Host "   ✅ Server stopped" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✨ All tests passed! Server is ready!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Push your code to GitHub" -ForegroundColor White
Write-Host "2. Follow instructions in RENDER_DEPLOYMENT.md" -ForegroundColor White
Write-Host "3. Deploy to Render!" -ForegroundColor White
Write-Host ""
