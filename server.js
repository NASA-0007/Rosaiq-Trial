/**
 * RosaIQ Air Quality Monitoring Server
 * 
 * Custom server for AirGradient devices
 * Receives sensor data, stores in database, and provides web dashboard
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const database = require('./database');
const { requireAuth, requireAdmin, optionalAuth } = require('./middleware/auth');

const app = express();

// Helper function to get IST timestamp
function getISTTimestamp() {
  const date = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('Z', '+05:30');
}

// Create firmware upload directory
const firmwareDir = path.join(__dirname, 'firmware');
if (!fs.existsSync(firmwareDir)) {
  fs.mkdirSync(firmwareDir, { recursive: true });
}

// Configure multer for firmware uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, firmwareDir);
  },
  filename: (req, file, cb) => {
    const version = req.body.version || Date.now();
    cb(null, `firmware-${version}.bin`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.bin')) {
      cb(null, true);
    } else {
      cb(new Error('Only .bin files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Trust proxy (required for Render deployment)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'rosaiq-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // Required for cross-origin in production
  },
  proxy: true // Trust the reverse proxy
}));

// Serve static files (no auth on static files - auth happens in JS)
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = getISTTimestamp();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Authentication & User Management Routes
// ============================================================================

/**
 * POST /api/auth/login
 * User login
 */
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const user = database.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    database.updateLastLogin(user.id);

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    console.log(`[LOGIN] Session created for user: ${user.username}, role: ${user.role}, sessionID: ${req.sessionID}`);

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('[LOGIN ERROR] Session save error:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      
      console.log(`[LOGIN SUCCESS] Session saved for user: ${user.username}`);
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          email: user.email
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * User logout
 */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/session
 * Get current session
 */
app.get('/api/auth/session', (req, res) => {
  console.log(`[SESSION CHECK] SessionID: ${req.sessionID}, UserID: ${req.session.userId}, Cookies: ${JSON.stringify(req.cookies)}`);
  
  if (req.session.userId) {
    const user = database.getUserById(req.session.userId);
    console.log(`[SESSION CHECK] Authenticated user: ${user.username}`);
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      }
    });
  } else {
    console.log(`[SESSION CHECK] Not authenticated - no userId in session`);
    res.json({ authenticated: false });
  }
});

/**
 * POST /api/auth/register (Admin only)
 * Create new user
 */
app.post('/api/auth/register', requireAdmin, (req, res) => {
  const { username, password, email, role } = req.body;

  try {
    // Check if user exists
    const existing = database.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user
    const result = database.createUser(username, passwordHash, email, role || 'user');

    res.json({
      success: true,
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/signup
 * Self-registration for new users (creates regular user account)
 */
app.post('/api/auth/signup', (req, res) => {
  const { username, password, email } = req.body;

  try {
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = database.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(password, 10);

    // Create user with 'user' role (never admin via self-signup)
    const result = database.createUser(username, passwordHash, email, 'user');

    console.log(`✓ New user registered via self-signup: ${username}`);

    // Auto-login after signup
    req.session.userId = result.lastInsertRowid;
    req.session.username = username;
    req.session.role = 'user';

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error' });
      }
      
      res.json({
        success: true,
        user: {
          id: result.lastInsertRowid,
          username: username,
          role: 'user',
          email: email
        }
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users (Admin only)
 * Get all users
 */
app.get('/api/users', requireAdmin, (req, res) => {
  try {
    const users = database.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:userId (Admin only)
 * Delete user
 */
app.delete('/api/users/:userId', requireAdmin, (req, res) => {
  try {
    database.deleteUser(req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Device Assignment Routes
// ============================================================================

/**
 * POST /api/devices/:deviceId/assign (Admin only)
 * Assign device to user
 */
app.post('/api/devices/:deviceId/assign', requireAdmin, (req, res) => {
  try {
    const { userId } = req.body;
    database.assignDeviceToUser(req.params.deviceId, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/:deviceId/unassign (Admin only)
 * Unassign device from user
 */
app.post('/api/devices/:deviceId/unassign', requireAdmin, (req, res) => {
  try {
    database.unassignDevice(req.params.deviceId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unassigning device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/devices/claim
 * Claim an unassigned device using serial number (any authenticated user)
 */
app.post('/api/devices/claim', requireAuth, (req, res) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }

    // Find device by serial number
    const device = database.getDeviceBySerial(serialNumber);

    if (!device) {
      return res.status(404).json({ error: 'Device not found. Make sure the device has connected to the server at least once.' });
    }

    // Check if already assigned
    if (device.user_id) {
      return res.status(400).json({ error: 'Device is already assigned to another user' });
    }

    // Assign to current user
    database.assignDeviceToUser(device.device_id, req.session.userId);

    console.log(`✓ Device ${serialNumber} claimed by user ${req.session.username}`);

    res.json({
      success: true,
      message: 'Device claimed successfully',
      device: {
        device_id: device.device_id,
        serial_number: device.serial_number
      }
    });
  } catch (error) {
    console.error('Error claiming device:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/devices/:deviceId/name
 * Update device custom name (user must own device or be admin)
 */
app.put('/api/devices/:deviceId/name', requireAuth, (req, res) => {
  try {
    const { customName } = req.body;
    const deviceId = req.params.deviceId;
    
    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    database.updateDeviceCustomName(deviceId, customName);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating device name:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/devices/unassigned (Admin only)
 * Get unassigned devices
 */
app.get('/api/admin/devices/unassigned', requireAdmin, (req, res) => {
  try {
    const devices = database.getUnassignedDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error getting unassigned devices:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AirGradient Local Server API Routes
// ============================================================================

/**
 * GET /config
 * Get device configuration (AirGradient local server API)
 * Returns configuration including httpDomain for OTA updates
 */
app.get('/config', (req, res) => {
  console.log('[CONFIG] Device requesting configuration');
  console.log('[CONFIG] Headers:', req.headers);
  console.log('[CONFIG] IP:', req.ip);
  
  // Get server hostname from request
  // Use x-forwarded-proto header if available (for proxies like Render)
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('host');
  const httpDomain = `${protocol}://${host}`;
  
  console.log('[CONFIG] Protocol:', protocol);
  console.log('[CONFIG] Host:', host);
  console.log('[CONFIG] Responding with httpDomain:', httpDomain);
  
  // Return AirGradient-compatible configuration
  res.json({
    country: "US",
    pmStandard: "ugm3",
    ledBarMode: "pm",
    abcDays: 8,
    tvocLearningOffset: 12,
    noxLearningOffset: 12,
    mqttBrokerUrl: "",
    httpDomain: httpDomain,  // This tells device to use our server for OTA
    temperatureUnit: "f",
    configurationControl: "both",  // Allow both local and cloud config
    postDataToAirGradient: false,  // Don't send data to AirGradient cloud
    ledBarBrightness: 100,
    displayBrightness: 100,
    offlineMode: false,
    model: "I-9PSL",
    disableCloudConnection: false
  });
});

/**
 * PUT /config
 * Update device configuration (AirGradient local server API)
 */
app.put('/config', (req, res) => {
  console.log('[CONFIG PUT] Device updating configuration');
  console.log('[CONFIG PUT] Body:', req.body);
  
  // Just acknowledge the update
  res.send('Success');
});

// ============================================================================
// Firmware OTA Update Routes
// ============================================================================

/**
 * GET /sensors/:deviceId/generic/os/firmware.bin?current_firmware=version
 * OTA firmware update endpoint (AirGradient compatible)
 * 
 * Responses:
 * - 304: Device already on latest version (with explanation text)
 * - 400: Unknown firmware version (e.g. "snapshot" from local builds)
 * - 200: Update available, returns binary data
 * - 404: No firmware available on server
 */
app.get('/sensors/:deviceId/generic/os/firmware.bin', (req, res) => {
  try {
    const { deviceId } = req.params;
    const currentVersion = req.query.current_firmware;

    console.log(`[OTA] ========================================`);
    console.log(`[OTA] Request URL: ${req.url}`);
    console.log(`[OTA] Request Path: ${req.path}`);
    console.log(`[OTA] Device ID: ${deviceId}`);
    console.log(`[OTA] Current Version: ${currentVersion}`);
    console.log(`[OTA] Protocol: ${req.protocol}`);
    console.log(`[OTA] Headers: ${JSON.stringify(req.headers)}`);
    console.log(`[OTA] ========================================`);

    // Get latest firmware
    const latestFirmware = database.getLatestFirmware();

    if (!latestFirmware) {
      console.log('[OTA] No firmware available on server');
      return res.status(404).send('No firmware available on server');
    }

    console.log(`[OTA] Latest firmware: ${latestFirmware.version}`);

    // Check if device reports an unknown/local build version (e.g., "snapshot")
    if (currentVersion && (currentVersion === 'snapshot' || currentVersion.includes('dev') || currentVersion.includes('local'))) {
      console.log(`[OTA] Device ${deviceId} running unknown/local firmware version: ${currentVersion}`);
      return res.status(400).send(''); // Empty payload for unknown versions
    }

    // Check if device is already on latest version
    if (currentVersion && currentVersion === latestFirmware.version) {
      console.log(`[OTA] Device ${deviceId} already on latest version ${currentVersion}`);
      return res.status(304).send(`Device is already running the latest firmware version ${currentVersion}`);
    }

    // Send firmware file
    const firmwarePath = path.join(__dirname, latestFirmware.file_path);
    
    console.log(`[OTA] Firmware path: ${firmwarePath}`);
    console.log(`[OTA] File exists: ${fs.existsSync(firmwarePath)}`);
    
    if (!fs.existsSync(firmwarePath)) {
      console.error(`[OTA ERROR] Firmware file not found: ${firmwarePath}`);
      return res.status(404).send('Firmware file not found on server');
    }

    console.log(`[OTA] ✓ Sending firmware ${latestFirmware.version} to ${deviceId} (from ${currentVersion || 'unknown'})`);
    
    // Log the update event
    database.logEvent(deviceId, 'ota_update', {
      from_version: currentVersion || 'unknown',
      to_version: latestFirmware.version
    });

    // Send binary with filename as "firmware.bin" (AirGradient default)
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="firmware.bin"');
    res.sendFile(firmwarePath);
  } catch (error) {
    console.error('[OTA ERROR]', error);
    res.status(500).send('Internal server error');
  }
});

// Alternative route to catch any variations in the OTA URL format
app.get('/sensors/*/generic/os/firmware.bin', (req, res) => {
  console.log(`[OTA FALLBACK] Caught request: ${req.url}`);
  console.log(`[OTA FALLBACK] Original URL: ${req.originalUrl}`);
  console.log(`[OTA FALLBACK] Path: ${req.path}`);
  
  // Extract device ID from path
  const pathParts = req.path.split('/');
  const deviceId = pathParts[2]; // /sensors/DEVICEID/generic/os/firmware.bin
  
  console.log(`[OTA FALLBACK] Extracted device ID: ${deviceId}`);
  
  // Forward to main handler by setting params
  req.params.deviceId = deviceId;
  
  // Call the main OTA handler logic
  try {
    const currentVersion = req.query.current_firmware;

    console.log(`[OTA FALLBACK] Processing for ${deviceId}, version: ${currentVersion}`);

    // Get latest firmware
    const latestFirmware = database.getLatestFirmware();

    if (!latestFirmware) {
      console.log('[OTA FALLBACK] No firmware available on server');
      return res.status(404).send('No firmware available on server');
    }

    console.log(`[OTA FALLBACK] Latest firmware: ${latestFirmware.version}`);

    // Check if device reports an unknown/local build version
    if (currentVersion && (currentVersion === 'snapshot' || currentVersion.includes('dev') || currentVersion.includes('local'))) {
      console.log(`[OTA FALLBACK] Unknown/local firmware version: ${currentVersion}`);
      return res.status(400).send('');
    }

    // Check if device is already on latest version
    if (currentVersion && currentVersion === latestFirmware.version) {
      console.log(`[OTA FALLBACK] Device already on latest version ${currentVersion}`);
      return res.status(304).send(`Device is already running the latest firmware version ${currentVersion}`);
    }

    // Send firmware file
    const firmwarePath = path.join(__dirname, latestFirmware.file_path);
    
    if (!fs.existsSync(firmwarePath)) {
      console.error(`[OTA FALLBACK ERROR] Firmware file not found: ${firmwarePath}`);
      return res.status(404).send('Firmware file not found on server');
    }

    console.log(`[OTA FALLBACK] ✓ Sending firmware ${latestFirmware.version} to ${deviceId}`);
    
    database.logEvent(deviceId, 'ota_update', {
      from_version: currentVersion || 'unknown',
      to_version: latestFirmware.version
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="firmware.bin"');
    res.sendFile(firmwarePath);
  } catch (error) {
    console.error('[OTA FALLBACK ERROR]', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * POST /api/admin/firmware/upload (Admin only)
 * Upload new firmware
 */
app.post('/api/admin/firmware/upload', requireAdmin, upload.single('firmware'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { version, notes } = req.body;

    if (!version) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version is required' });
    }

    // Check if version already exists
    const existing = database.getFirmwareByVersion(version);
    if (existing) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Version already exists' });
    }

    // Save firmware metadata to database
    database.addFirmware(
      version,
      req.file.filename,
      `firmware/${req.file.filename}`,
      req.file.size,
      req.session.userId,
      notes
    );

    console.log(`✓ Firmware ${version} uploaded by user ${req.session.username}`);

    res.json({
      success: true,
      firmware: {
        version,
        filename: req.file.filename,
        size: req.file.size
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Firmware upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/firmware (Admin only)
 * Get all firmware versions
 */
app.get('/api/admin/firmware', requireAdmin, (req, res) => {
  try {
    const firmware = database.getAllFirmware();
    res.json(firmware);
  } catch (error) {
    console.error('Error getting firmware:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/firmware/:id (Admin only)
 * Delete firmware
 */
app.delete('/api/admin/firmware/:id', requireAdmin, (req, res) => {
  try {
    const firmwareId = parseInt(req.params.id);
    
    // Get firmware by ID (not version)
    const firmware = database.db.prepare('SELECT * FROM firmware WHERE id = ?').get(firmwareId);
    
    if (!firmware) {
      return res.status(404).json({ error: 'Firmware not found' });
    }

    console.log(`[FIRMWARE DELETE] Deleting firmware ID ${firmwareId}, version ${firmware.version}`);

    // Delete file from filesystem
    const firmwarePath = path.join(__dirname, firmware.file_path);
    if (fs.existsSync(firmwarePath)) {
      fs.unlinkSync(firmwarePath);
      console.log(`[FIRMWARE DELETE] ✓ Deleted file: ${firmwarePath}`);
    } else {
      console.log(`[FIRMWARE DELETE] Warning: File not found: ${firmwarePath}`);
    }

    // Delete from database
    database.deleteFirmware(firmwareId);
    console.log(`[FIRMWARE DELETE] ✓ Deleted from database`);

    res.json({ success: true, message: 'Firmware deleted successfully' });
  } catch (error) {
    console.error('[FIRMWARE DELETE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
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
 * Get devices (filtered by user unless admin)
 */
app.get('/api/devices', requireAuth, (req, res) => {
  try {
    let devices;
    
    // Admin sees all devices, users see only their assigned devices
    if (req.session.role === 'admin') {
      devices = database.getAllDevices();
    } else {
      devices = database.getDevicesByUserId(req.session.userId);
    }
    
    // Enrich with latest measurements
    const enrichedDevices = devices.map(device => {
      const latestMeasurement = database.getLatestMeasurement(device.device_id);
      const stats = database.getDeviceStats(device.device_id);
      
      // Use custom name if set, otherwise use device_id
      const displayName = device.custom_name || device.device_id;
      
      return {
        ...device,
        displayName,
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
 * Get specific device information (must own or be admin)
 */
app.get('/api/devices/:deviceId', requireAuth, (req, res) => {
  try {
    const device = database.getDevice(req.params.deviceId);
    
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, req.params.deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
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
 * Update device information (must own or be admin)
 */
app.put('/api/devices/:deviceId', requireAuth, (req, res) => {
  try {
    const { name, location, notes } = req.body;
    
    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, req.params.deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
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
 * Get measurements for a device (must own or be admin)
 */
app.get('/api/devices/:deviceId/measurements', requireAuth, (req, res) => {
  try {
    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, req.params.deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
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
 * Get device configuration (must own or be admin)
 */
app.get('/api/devices/:deviceId/config', requireAuth, (req, res) => {
  try {
    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, req.params.deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const config = database.getDeviceConfig(req.params.deviceId);
    res.json(config);
  } catch (error) {
    console.error('Error getting device config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/devices/:deviceId/config
 * Update device configuration (must own or be admin)
 */
app.put('/api/devices/:deviceId/config', requireAuth, (req, res) => {
  try {
    // Check ownership or admin
    if (req.session.role !== 'admin' && !database.userOwnsDevice(req.session.userId, req.params.deviceId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
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
 * Get dashboard summary statistics (filtered by user)
 */
app.get('/api/dashboard/summary', requireAuth, (req, res) => {
  try {
    let devices;
    
    // Admin sees all devices, users see only their assigned devices
    if (req.session.role === 'admin') {
      devices = database.getAllDevices();
    } else {
      devices = database.getDevicesByUserId(req.session.userId);
    }
    
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
 * POST /api/maintenance/cleanup (Admin only)
 * Clean old data based on retention policy
 */
app.post('/api/maintenance/cleanup', requireAdmin, (req, res) => {
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
