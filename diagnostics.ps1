# RosaIQ Server - Diagnostic & Troubleshooting Script

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RosaIQ Server - Diagnostic Check" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_IP = "192.168.100.171"
$SERVER_PORT = "3000"
$DEVICE_SERIAL = "YOUR_DEVICE_SERIAL"  # Replace with your device serial number

Write-Host "Testing RosaIQ Server at: http://$SERVER_IP`:$SERVER_PORT" -ForegroundColor Yellow
Write-Host ""

# Test 1: Server Health
Write-Host "Test 1: Checking Server Health..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://$SERVER_IP`:$SERVER_PORT/health" -Method Get -TimeoutSec 5
    Write-Host "  ✓ Server is running!" -ForegroundColor Green
    Write-Host "    Status: $($response.status)" -ForegroundColor Gray
    Write-Host "    Uptime: $([math]::Round($response.uptime, 2)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Server is NOT accessible!" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Make sure the server is running (npm start)" -ForegroundColor Yellow
    Write-Host "    2. Check if port 3000 is not blocked by firewall" -ForegroundColor Yellow
    Write-Host "    3. Verify the IP address is correct" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Test 2: Network Connectivity
Write-Host "Test 2: Testing Network Connectivity..." -ForegroundColor Green
try {
    $ping = Test-Connection -ComputerName $SERVER_IP -Count 2 -Quiet
    if ($ping) {
        Write-Host "  ✓ Server is reachable on network!" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Cannot ping server!" -ForegroundColor Red
    }
} catch {
    Write-Host "  ⚠ Ping test inconclusive" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Check if port is open
Write-Host "Test 3: Checking if Port $SERVER_PORT is Open..." -ForegroundColor Green
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect($SERVER_IP, $SERVER_PORT)
    $tcpClient.Close()
    Write-Host "  ✓ Port $SERVER_PORT is open and accepting connections!" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Port $SERVER_PORT is not accessible!" -ForegroundColor Red
    Write-Host "    This could be a firewall issue" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Check API Endpoints
Write-Host "Test 4: Testing API Endpoints..." -ForegroundColor Green

# Test GET config endpoint
$testDeviceId = "airgradient:test123"
Write-Host "  Testing GET /sensors/$testDeviceId/one/config" -ForegroundColor Gray
try {
    $configResponse = Invoke-RestMethod -Uri "http://$SERVER_IP`:$SERVER_PORT/sensors/$testDeviceId/one/config" -Method Get -TimeoutSec 5
    Write-Host "    ✓ Config endpoint working!" -ForegroundColor Green
} catch {
    Write-Host "    ✗ Config endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test POST measures endpoint
Write-Host "  Testing POST /sensors/$testDeviceId/measures" -ForegroundColor Gray
try {
    $testData = @{
        wifi = -50
        rco2 = 400
        pm02 = 5
        atmp = 22.5
        rhum = 45
        boot = 1
    } | ConvertTo-Json
    
    $postResponse = Invoke-RestMethod -Uri "http://$SERVER_IP`:$SERVER_PORT/sensors/$testDeviceId/measures" -Method Post -Body $testData -ContentType "application/json" -TimeoutSec 5
    Write-Host "    ✓ POST endpoint working!" -ForegroundColor Green
} catch {
    Write-Host "    ✗ POST endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check Devices
Write-Host "Test 5: Checking Connected Devices..." -ForegroundColor Green
try {
    $devices = Invoke-RestMethod -Uri "http://$SERVER_IP`:$SERVER_PORT/api/devices" -Method Get -TimeoutSec 5
    Write-Host "  ✓ Found $($devices.Count) device(s) in database" -ForegroundColor Green
    
    if ($devices.Count -eq 0) {
        Write-Host "    No devices connected yet. Waiting for first connection..." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "  Registered Devices:" -ForegroundColor Cyan
        foreach ($device in $devices) {
            Write-Host "    • $($device.device_id)" -ForegroundColor Gray
            Write-Host "      Serial: $($device.serial_number)" -ForegroundColor Gray
            Write-Host "      Last seen: $($device.last_seen)" -ForegroundColor Gray
            if ($device.latestMeasurement) {
                Write-Host "      CO2: $($device.latestMeasurement.rco2) ppm | PM2.5: $($device.latestMeasurement.pm02) µg/m³" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }
} catch {
    Write-Host "  ✗ Could not fetch devices: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Windows Firewall Check
Write-Host "Test 6: Checking Windows Firewall..." -ForegroundColor Green
try {
    $firewallRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*3000*" -or $_.DisplayName -like "*Node*" }
    if ($firewallRules) {
        Write-Host "  ⚠ Found firewall rules that might affect Node.js" -ForegroundColor Yellow
        Write-Host "    If devices can't connect, you may need to allow port 3000" -ForegroundColor Yellow
    } else {
        Write-Host "  ℹ No specific firewall rules found for port 3000" -ForegroundColor Gray
        Write-Host "    You may need to add a firewall rule if devices can't connect" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ℹ Could not check firewall (requires admin privileges)" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server URL: http://$SERVER_IP`:$SERVER_PORT" -ForegroundColor White
Write-Host "Dashboard: http://$SERVER_IP`:$SERVER_PORT" -ForegroundColor White
Write-Host ""

# Device Configuration Command
Write-Host "To configure your AirGradient device, run this command:" -ForegroundColor Yellow
Write-Host ""
Write-Host "curl.exe -X PUT -H `"Content-Type: application/json`" ``" -ForegroundColor Cyan
Write-Host "  -d `"{\`"httpDomain\`":\`"$SERVER_IP`:$SERVER_PORT\`"}`" ``" -ForegroundColor Cyan
Write-Host "  http://airgradient_YOUR_SERIAL.local/config" -ForegroundColor Cyan
Write-Host ""
Write-Host "Replace YOUR_SERIAL with your device's serial number" -ForegroundColor Gray
Write-Host ""

# Firewall Command
Write-Host "If devices can't connect, allow port $SERVER_PORT in firewall:" -ForegroundColor Yellow
Write-Host ""
Write-Host "netsh advfirewall firewall add rule name=`"RosaIQ Server`" dir=in action=allow protocol=TCP localport=$SERVER_PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "(Run PowerShell as Administrator for this command)" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
