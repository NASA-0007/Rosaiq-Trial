# RosaIQ Multi-User System - Quick Start Test

Write-Host "🚀 Starting RosaIQ Multi-User Air Quality Server..." -ForegroundColor Cyan
Write-Host ""

# Check if database exists
if (Test-Path ".\rosaiq-airquality.db") {
    Write-Host "📊 Existing database found" -ForegroundColor Yellow
    $backup = Read-Host "Do you want to backup the existing database? (y/n)"
    if ($backup -eq "y") {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        Copy-Item ".\rosaiq-airquality.db" ".\rosaiq-airquality.db.$timestamp.backup"
        Write-Host "✅ Database backed up to rosaiq-airquality.db.$timestamp.backup" -ForegroundColor Green
    }
} else {
    Write-Host "📊 New database will be created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Starting server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ACCESS YOUR SERVER:" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Login Page:    http://localhost:3000" -ForegroundColor White
Write-Host "  Admin Panel:   http://localhost:3000/admin/" -ForegroundColor White
Write-Host "  User Dashboard: http://localhost:3000/dashboard.html" -ForegroundColor White
Write-Host ""
Write-Host "  Default Admin Credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin" -ForegroundColor Yellow
Write-Host "  Password: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm start
