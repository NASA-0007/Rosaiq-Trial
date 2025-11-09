/**
 * RosaIQ Air Quality Monitoring Server
 * 
 * Custom server for AirGradient devices
 * Receives sensor data, stores in database, and provides web dashboard
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const database = require('./database');

const app = express();

// Helper function to get IST timestamp
function getISTTimestamp() {
  const date = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('Z', '+05:30');
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = getISTTimestamp();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// API Authentication middleware (if enabled)
const authenticate = (req, res, next) => {
  if (!config.api.enableAuth) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== config.api.apiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing API key' });
  }
  next();
};

// ============================================================================
// AirGradient Device API Endpoints
// ============================================================================

/**
 * POST /sensors/:deviceId/measures
 * Receive measurement data from AirGradient device
 */
app.post('/sensors/:deviceId/measures', authenticate, (req, res) => {
  const { deviceId } = req.params;
  const data = req.body;

  try {
    // Extract serial number from device ID (format: airgradient:serialnumber)
    const serialNumber = deviceId.replace('rosaiq:', '');

    // Register/update device
    database.registerDevice(deviceId, serialNumber);

    // Insert measurement
    database.insertMeasurement(deviceId, data);

    // Log event
    database.logEvent(deviceId, 'measurement_received', {
      co2: data.rco2,
      pm25: data.pm02,
      temp: data.atmp,
    });

    console.log(`✓ Data received from ${deviceId}:`, {
      co2: data.rco2,
      pm25: data.pm02,
      temp: data.atmp,
      humidity: data.rhum,
    });

    res.status(200).json({ 
      success: true, 
      message: 'Data received successfully',
      timestamp: getISTTimestamp(),
    });
  } catch (error) {
    console.error('Error saving measurement:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

/**
 * GET /sensors/:deviceId/one/config
 * Provide device configuration to AirGradient device
 */
app.get('/sensors/:deviceId/one/config', authenticate, (req, res) => {
  const { deviceId } = req.params;

  try {
    // Check if device exists
    let device = database.getDevice(deviceId);
    
    if (!device) {
      // Register new device
      const serialNumber = deviceId.replace('rosaiq:', '');
      database.registerDevice(deviceId, serialNumber);
      
      // Create default config
      database.setDeviceConfig(deviceId, config.deviceDefaults);
      
      console.log(`✓ New device registered: ${deviceId}`);
    }

    // Get device configuration
    const dbConfig = database.getDeviceConfig(deviceId);

    // Format configuration for AirGradient device
    const deviceConfig = {
      country: dbConfig.country,
      pmStandard: dbConfig.pm_standard,
      ledBarMode: dbConfig.led_bar_mode,
      abcDays: dbConfig.abc_days,
      tvocLearningOffset: dbConfig.tvoc_learning_offset,
      noxLearningOffset: dbConfig.nox_learning_offset,
      mqttBrokerUrl: dbConfig.mqtt_broker_url,
      temperatureUnit: dbConfig.temperature_unit,
      configurationControl: dbConfig.configuration_control,
      postDataToAirGradient: Boolean(dbConfig.post_data_to_airgradient),
      ledBarBrightness: dbConfig.led_bar_brightness,
      displayBrightness: dbConfig.display_brightness,
    };

    console.log(`✓ Configuration sent to ${deviceId}`);

    res.status(200).json(deviceConfig);
  } catch (error) {
    console.error('Error getting configuration:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// ============================================================================
// RosaIQ Dashboard API Endpoints
// ============================================================================

/**
 * GET /api/devices
 * Get all registered devices
 */
app.get('/api/devices', (req, res) => {
  try {
    const devices = database.getAllDevices();
    
    // Enrich with latest measurements
    const enrichedDevices = devices.map(device => {
      const latestMeasurement = database.getLatestMeasurement(device.device_id);
      const stats = database.getDeviceStats(device.device_id);
      
      return {
        ...device,
        latestMeasurement,
        stats,
      };
    });

    res.json(enrichedDevices);
  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices/:deviceId
 * Get specific device information
 */
app.get('/api/devices/:deviceId', (req, res) => {
  try {
    const device = database.getDevice(req.params.deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const latestMeasurement = database.getLatestMeasurement(req.params.deviceId);
    const stats = database.getDeviceStats(req.params.deviceId);

    res.json({
      ...device,
      latestMeasurement,
      stats,
    });
  } catch (error) {
    console.error('Error getting device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/devices/:deviceId
 * Update device information
 */
app.put('/api/devices/:deviceId', (req, res) => {
  try {
    const { name, location, notes } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (notes !== undefined) updates.notes = notes;

    database.updateDevice(req.params.deviceId, updates);
    
    res.json({ success: true, message: 'Device updated successfully' });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices/:deviceId/measurements
 * Get measurements for a device
 */
app.get('/api/devices/:deviceId/measurements', (req, res) => {
  try {
    const { start, end, limit } = req.query;
    
    const measurements = database.getMeasurements(
      req.params.deviceId,
      start,
      end,
      limit ? parseInt(limit) : 1000
    );

    res.json(measurements);
  } catch (error) {
    console.error('Error getting measurements:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices/:deviceId/config
 * Get device configuration
 */
app.get('/api/devices/:deviceId/config', (req, res) => {
  try {
    const config = database.getDeviceConfig(req.params.deviceId);
    res.json(config);
  } catch (error) {
    console.error('Error getting device config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/devices/:deviceId/config
 * Update device configuration
 */
app.put('/api/devices/:deviceId/config', (req, res) => {
  try {
    database.setDeviceConfig(req.params.deviceId, req.body);
    
    database.logEvent(req.params.deviceId, 'config_updated', req.body);
    
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating device config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/summary
 * Get dashboard summary statistics
 */
app.get('/api/dashboard/summary', (req, res) => {
  try {
    const devices = database.getAllDevices();
    const activeDevices = devices.filter(d => {
      const lastSeen = new Date(d.last_seen);
      const now = new Date();
      const diffMinutes = (now - lastSeen) / (1000 * 60);
      return diffMinutes < 10; // Active if seen in last 10 minutes
    });

    let totalMeasurements = 0;
    let avgCO2 = 0;
    let avgPM25 = 0;

    devices.forEach(device => {
      const stats = database.getDeviceStats(device.device_id);
      totalMeasurements += stats.total_measurements || 0;
      avgCO2 += stats.avg_co2 || 0;
      avgPM25 += stats.avg_pm25 || 0;
    });

    const deviceCount = devices.length;
    if (deviceCount > 0) {
      avgCO2 /= deviceCount;
      avgPM25 /= deviceCount;
    }

    res.json({
      totalDevices: deviceCount,
      activeDevices: activeDevices.length,
      totalMeasurements,
      averages: {
        co2: Math.round(avgCO2),
        pm25: Math.round(avgPM25 * 10) / 10,
      },
    });
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/maintenance/cleanup
 * Clean old data based on retention policy
 */
app.post('/api/maintenance/cleanup', (req, res) => {
  try {
    const result = database.cleanOldData();
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error cleaning old data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Health Check & Info Endpoints
// ============================================================================

/**
 * GET /health
 * Server health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: getISTTimestamp(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

/**
 * GET /api/info
 * Server information
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: config.branding.companyName,
    version: '1.0.0',
    description: 'RosaIQ Air Quality Monitoring Server',
    endpoints: {
      devices: '/api/devices',
      dashboard: '/api/dashboard/summary',
      health: '/health',
    },
  });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found', 
    message: `Route ${req.method} ${req.path} not found` 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// ============================================================================
// Server Startup
// ============================================================================

// Initialize database
if (!database.initialize()) {
  console.error('Failed to initialize database. Exiting...');
  process.exit(1);
}

// Start server
const server = app.listen(config.server.port, config.server.host, () => {
  console.log('\n' + '='.repeat(60));
  console.log(`  🌟 ${config.branding.companyName} Air Quality Server`);
  console.log('='.repeat(60));
  console.log(`  ✓ Server running on: http://${config.server.host}:${config.server.port}`);
  console.log(`  ✓ Dashboard: http://localhost:${config.server.port}`);
  console.log(`  ✓ API: http://localhost:${config.server.port}/api`);
  console.log(`  ✓ Database: ${config.database.path}`);
  console.log('='.repeat(60));
  console.log('\n  Waiting for AirGradient devices to connect...\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  server.close(() => {
    database.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  server.close(() => {
    database.close();
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
