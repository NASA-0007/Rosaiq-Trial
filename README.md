# RosaIQ Air Quality Monitoring Server

🌟 Custom server for AirGradient air quality monitoring devices. Complete independence from AirGradient cloud with full data control.

![RosaIQ Dashboard](https://img.shields.io/badge/Status-Production_Ready-success)
![Node.js](https://img.shields.io/badge/Node.js-14+-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Render Compatible](https://img.shields.io/badge/Render-Compatible-blue?logo=render)

---

## 🎉 What's New in v2.1

### Self-Service Features
- ✨ **User Self-Registration** - No admin approval needed! Users can sign up instantly
- 📱 **Device Claiming** - Users claim devices by entering serial numbers
- 🚀 **Zero Admin Overhead** - Fully automated user and device onboarding

[Read the complete guide →](SELF_SERVICE_GUIDE.md) | [See all updates →](LATEST_UPDATES.md)

---

## Features

✅ **Complete Device Management**
- Monitor multiple AirGradient devices simultaneously
- Real-time air quality data visualization
- Historical data storage and analysis
- Device configuration management

✅ **Comprehensive Air Quality Metrics**
- CO₂ (Carbon Dioxide) levels
- PM1.0, PM2.5, PM10 (Particulate Matter)
- Temperature and Humidity
- TVOC (Total Volatile Organic Compounds)
- NOx (Nitrogen Oxides)
- WiFi signal strength

✅ **Beautiful Web Dashboard**
- Real-time data updates
- Interactive charts and graphs
- Device status monitoring
- Easy configuration interface
- Mobile-responsive design

✅ **Data Management**
- SQLite database (no setup required)
- Configurable data retention
- Data export capabilities
- Event logging

✅ **Full Independence**
- No dependency on AirGradient cloud
- Your data stays on your infrastructure
- Complete privacy and control
- Works offline

## Deployment Options

### 🚀 Deploy to Render (Recommended)

**One-click deploy to the cloud for FREE!**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for detailed deployment instructions.

**Why Render?**
- ✅ Free tier with 512MB RAM
- ✅ Persistent disk storage (1GB)
- ✅ Automatic SSL certificates
- ✅ Auto-deploys from GitHub
- ✅ No credit card required

### 💻 Local Development

## Quick Start

### Prerequisites

- Node.js 14 or higher ([Download](https://nodejs.org/))
- AirGradient device(s)

### Installation

1. **Install Dependencies**

```bash
cd custom-server
npm install
```

2. **Start the Server**

```bash
npm start
```

The server will start on `http://localhost:3000`

3. **Configure Your AirGradient Device**

Option A: Use the device's local API (easiest):

```bash
# Replace <serial> with your device's serial number
curl -X PUT -H "Content-Type: application/json" \
  -d '{"httpDomain":"YOUR_SERVER_IP_OR_DOMAIN"}' \
  http://airgradient_<serial>.local/config
```

Option B: Flash modified firmware (see [Firmware Modification](#firmware-modification))

4. **Open Dashboard**

Navigate to `http://localhost:3000` in your web browser

## Configuration

Edit `config.js` to customize server settings:

```javascript
module.exports = {
  // Server configuration
  server: {
    port: 3000,           // Change server port
    host: '0.0.0.0',      // Bind to all interfaces
  },

  // Database
  database: {
    path: './rosaiq-airquality.db',  // Database file location
  },

  // Data retention (days)
  dataRetention: {
    measurements: 365,    // Keep 1 year of data
    events: 90,           // Keep 90 days of logs
  },

  // Company branding
  branding: {
    companyName: 'RosaIQ',
    dashboardTitle: 'RosaIQ Air Quality Monitor',
  },
};
```

## API Documentation

### AirGradient Device Endpoints

#### POST /sensors/:deviceId/measures
Receive measurement data from devices

**Request:**
```json
{
  "wifi": -46,
  "rco2": 447,
  "pm02": 7,
  "atmp": 25.87,
  "rhum": 43
}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-11-06T10:30:00Z"
}
```

#### GET /sensors/:deviceId/one/config
Provide device configuration

**Response:**
```json
{
  "country": "US",
  "pmStandard": "ugm3",
  "ledBarMode": "pm",
  "temperatureUnit": "c",
  "ledBarBrightness": 100
}
```

### Dashboard API Endpoints

#### GET /api/devices
Get all registered devices with latest measurements

#### GET /api/devices/:deviceId
Get specific device information

#### GET /api/devices/:deviceId/measurements
Get historical measurements

Query parameters:
- `start` - Start timestamp
- `end` - End timestamp
- `limit` - Maximum number of records (default: 1000)

#### PUT /api/devices/:deviceId/config
Update device configuration

#### GET /api/dashboard/summary
Get dashboard summary statistics

## Firmware Modification

To make your AirGradient device automatically connect to your server:

1. **Edit `src/AgApiClient.h`**

Change line 23-27:

```cpp
// Before:
String apiRoot = "https://hw.airgradient.com";

// After:
String apiRoot = "http://YOUR_SERVER_IP:3000";
```

2. **Compile and Upload**

Follow the instructions in `docs/howto-compile.md` to compile and upload the modified firmware to your device.

## Dashboard Features

### Main Dashboard
- Overview of all connected devices
- Summary statistics (total devices, active devices, average metrics)
- Quick device status view

### Device Details
- **Measurements Tab**: Real-time sensor readings
- **Charts Tab**: Historical data visualization
- **Configuration Tab**: Device settings management
- **Info Tab**: Device information and statistics

## Production Deployment

### Using with a Domain

1. **Set up reverse proxy (Nginx example):**

```nginx
server {
    listen 80;
    server_name airquality.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. **Enable HTTPS with Let's Encrypt:**

```bash
sudo certbot --nginx -d airquality.yourdomain.com
```

### Running as a Service

Create systemd service file `/etc/systemd/system/rosaiq-airquality.service`:

```ini
[Unit]
Description=RosaIQ Air Quality Server
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/path/to/custom-server
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable rosaiq-airquality
sudo systemctl start rosaiq-airquality
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t rosaiq-airquality .
docker run -d -p 3000:3000 -v ./data:/app/data rosaiq-airquality
```

## Database Management

### Backup Database

```bash
# Simple file copy (stop server first)
cp rosaiq-airquality.db rosaiq-airquality.db.backup

# Or use SQLite backup
sqlite3 rosaiq-airquality.db ".backup rosaiq-airquality.db.backup"
```

### Clean Old Data

Manually trigger cleanup:

```bash
curl -X POST http://localhost:3000/api/maintenance/cleanup
```

Or edit `config.js` to adjust retention periods.

### Export Data

Use SQLite command line:

```bash
# Export all measurements to CSV
sqlite3 -header -csv rosaiq-airquality.db \
  "SELECT * FROM measurements ORDER BY timestamp DESC;" > measurements.csv

# Export specific device data
sqlite3 -header -csv rosaiq-airquality.db \
  "SELECT * FROM measurements WHERE device_id='airgradient:xxxxx';" > device_data.csv
```

## Troubleshooting

### Server Won't Start

**Check port availability:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

**Check Node.js version:**
```bash
node --version  # Should be 14 or higher
```

### Device Not Connecting

1. **Check network connectivity:**
   - Ensure device and server are on same network
   - Try pinging server from device network

2. **Check device configuration:**
   ```bash
   curl http://airgradient_<serial>.local/config
   ```
   Look for `httpDomain` field

3. **Check server logs:**
   Look for incoming requests when device tries to connect

### No Data Showing

1. **Check database:**
   ```bash
   sqlite3 rosaiq-airquality.db "SELECT COUNT(*) FROM measurements;"
   ```

2. **Check browser console:**
   Open DevTools (F12) and look for JavaScript errors

3. **Verify API responses:**
   ```bash
   curl http://localhost:3000/api/devices
   ```

## Development

### Running in Development Mode

```bash
npm install --save-dev nodemon
npm run dev
```

This will auto-restart the server when files change.

### Database Schema

See `database.js` for complete schema. Main tables:

- `devices` - Device information
- `device_configs` - Device configurations
- `measurements` - Sensor data
- `events` - Event logs
- `alerts` - Alert notifications

## Air Quality Index Reference

### CO₂ Levels (ppm)
- 🟢 Good: < 800 ppm
- 🟡 Moderate: 800-1200 ppm
- 🔴 Poor: > 1200 ppm

### PM2.5 Levels (µg/m³)
- 🟢 Good: 0-12
- 🟡 Moderate: 12-35
- 🟠 Unhealthy for Sensitive Groups: 35-55
- 🔴 Unhealthy: > 55

## Support

For questions or issues:

1. Check the [main documentation](../docs/custom-server-setup.md)
2. Review [AirGradient documentation](../docs/)
3. Open an issue on GitHub

## License

MIT License - feel free to use and modify for your needs.

## Credits

- Built for AirGradient air quality monitors
- Developed by RosaIQ
- Powered by Node.js, Express, and SQLite

---

**Made with ❤️ by RosaIQ** | Air Quality Monitoring System
