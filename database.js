/**
 * RosaIQ Air Quality Database Module
 * 
 * Handles all database operations for storing and retrieving
 * air quality measurements and device configurations
 */

const Database = require('better-sqlite3');
const config = require('./config');
const path = require('path');

// Helper function to get IST timestamp
function getISTTimestamp() {
  const date = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  return istDate.toISOString().replace('Z', '+05:30');
}

class RosaIQDatabase {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  initialize() {
    try {
      // Ensure database directory exists (for Render persistent disk)
      const dbDir = path.dirname(config.database.path);
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`✓ Created database directory: ${dbDir}`);
      }

      this.db = new Database(config.database.path);
      this.db.pragma('journal_mode = WAL');
      this.createTables();
      console.log(`✓ Database initialized: ${config.database.path}`);
      return true;
    } catch (error) {
      console.error('✗ Database initialization failed:', error.message);
      return false;
    }
  }

  /**
   * Create database tables
   */
  createTables() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Create default admin user if not exists
    const adminExists = this.db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const defaultPassword = bcrypt.hashSync('rosaiq123$', 10);
      this.db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', defaultPassword, 'admin');
      console.log('✓ Default admin user created (username: admin, password: admin123)');
    }

    // Devices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        device_id TEXT PRIMARY KEY,
        serial_number TEXT NOT NULL UNIQUE,
        custom_name TEXT,
        name TEXT,
        location TEXT,
        model TEXT,
        firmware_version TEXT,
        user_id INTEGER,
        first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active',
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Device configurations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_configs (
        device_id TEXT PRIMARY KEY,
        country TEXT DEFAULT 'US',
        pm_standard TEXT DEFAULT 'ugm3',
        led_bar_mode TEXT DEFAULT 'pm',
        abc_days INTEGER DEFAULT 8,
        tvoc_learning_offset INTEGER DEFAULT 12,
        nox_learning_offset INTEGER DEFAULT 12,
        mqtt_broker_url TEXT DEFAULT '',
        temperature_unit TEXT DEFAULT 'c',
        configuration_control TEXT DEFAULT 'local',
        post_data_to_airgradient INTEGER DEFAULT 0,
        led_bar_brightness INTEGER DEFAULT 100,
        display_brightness INTEGER DEFAULT 100,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      )
    `);

    // Measurements table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        wifi_rssi INTEGER,
        rco2 INTEGER,
        pm01 REAL,
        pm02 REAL,
        pm10 REAL,
        pm02_compensated REAL,
        pm003_count INTEGER,
        pm005_count INTEGER,
        pm01_count INTEGER,
        pm02_count INTEGER,
        pm50_count INTEGER,
        pm10_count INTEGER,
        atmp REAL,
        atmp_compensated REAL,
        rhum INTEGER,
        rhum_compensated INTEGER,
        tvoc_index INTEGER,
        tvoc_raw INTEGER,
        nox_index INTEGER,
        nox_raw INTEGER,
        boot INTEGER,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_measurements_device_timestamp 
      ON measurements(device_id, timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_measurements_timestamp 
      ON measurements(timestamp DESC);
      
      CREATE INDEX IF NOT EXISTS idx_devices_last_seen 
      ON devices(last_seen DESC);
    `);

    // Events/logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        event_type TEXT NOT NULL,
        event_data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      )
    `);

    // Firmware uploads table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS firmware (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    // Alerts table (for future use)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT DEFAULT 'warning',
        message TEXT,
        value REAL,
        threshold REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Register or update a device
   */
  registerDevice(deviceId, serialNumber, model = null, firmwareVersion = null) {
    const timestamp = getISTTimestamp();
    const stmt = this.db.prepare(`
      INSERT INTO devices (device_id, serial_number, model, firmware_version, last_seen)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        last_seen = ?,
        model = COALESCE(?, model),
        firmware_version = COALESCE(?, firmware_version)
    `);
    
    return stmt.run(deviceId, serialNumber, model, firmwareVersion, timestamp, timestamp, model, firmwareVersion);
  }

  /**
   * Get device by ID
   */
  getDevice(deviceId) {
    const stmt = this.db.prepare('SELECT * FROM devices WHERE device_id = ?');
    return stmt.get(deviceId);
  }

  /**
   * Get all devices
   */
  getAllDevices() {
    const stmt = this.db.prepare('SELECT * FROM devices ORDER BY last_seen DESC');
    return stmt.all();
  }

  /**
   * Update device information
   */
  updateDevice(deviceId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    const stmt = this.db.prepare(`UPDATE devices SET ${fields} WHERE device_id = ?`);
    return stmt.run(...values, deviceId);
  }

  /**
   * Get device configuration
   */
  getDeviceConfig(deviceId) {
    const stmt = this.db.prepare('SELECT * FROM device_configs WHERE device_id = ?');
    let config = stmt.get(deviceId);
    
    // If no config exists, create default
    if (!config) {
      this.setDeviceConfig(deviceId, config.deviceDefaults);
      config = stmt.get(deviceId);
    }
    
    return config;
  }

  /**
   * Set device configuration
   */
  setDeviceConfig(deviceId, configData) {
    const timestamp = getISTTimestamp();
    const stmt = this.db.prepare(`
      INSERT INTO device_configs (
        device_id, country, pm_standard, led_bar_mode, abc_days,
        tvoc_learning_offset, nox_learning_offset, mqtt_broker_url,
        temperature_unit, configuration_control, post_data_to_airgradient,
        led_bar_brightness, display_brightness
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_id) DO UPDATE SET
        country = ?,
        pm_standard = ?,
        led_bar_mode = ?,
        abc_days = ?,
        tvoc_learning_offset = ?,
        nox_learning_offset = ?,
        mqtt_broker_url = ?,
        temperature_unit = ?,
        configuration_control = ?,
        post_data_to_airgradient = ?,
        led_bar_brightness = ?,
        display_brightness = ?,
        updated_at = ?
    `);

    return stmt.run(
      deviceId,
      configData.country || config.deviceDefaults.country,
      configData.pmStandard || config.deviceDefaults.pmStandard,
      configData.ledBarMode || config.deviceDefaults.ledBarMode,
      configData.abcDays || config.deviceDefaults.abcDays,
      configData.tvocLearningOffset || config.deviceDefaults.tvocLearningOffset,
      configData.noxLearningOffset || config.deviceDefaults.noxLearningOffset,
      configData.mqttBrokerUrl || config.deviceDefaults.mqttBrokerUrl,
      configData.temperatureUnit || config.deviceDefaults.temperatureUnit,
      configData.configurationControl || config.deviceDefaults.configurationControl,
      configData.postDataToAirGradient ? 1 : 0,
      configData.ledBarBrightness || config.deviceDefaults.ledBarBrightness,
      configData.displayBrightness || config.deviceDefaults.displayBrightness,
      // Repeat for UPDATE clause
      configData.country || config.deviceDefaults.country,
      configData.pmStandard || config.deviceDefaults.pmStandard,
      configData.ledBarMode || config.deviceDefaults.ledBarMode,
      configData.abcDays || config.deviceDefaults.abcDays,
      configData.tvocLearningOffset || config.deviceDefaults.tvocLearningOffset,
      configData.noxLearningOffset || config.deviceDefaults.noxLearningOffset,
      configData.mqttBrokerUrl || config.deviceDefaults.mqttBrokerUrl,
      configData.temperatureUnit || config.deviceDefaults.temperatureUnit,
      configData.configurationControl || config.deviceDefaults.configurationControl,
      configData.postDataToAirGradient ? 1 : 0,
      configData.ledBarBrightness || config.deviceDefaults.ledBarBrightness,
      configData.displayBrightness || config.deviceDefaults.displayBrightness,
      timestamp
    );
  }

  /**
   * Insert measurement data
   */
  insertMeasurement(deviceId, data) {
    const timestamp = getISTTimestamp();
    const stmt = this.db.prepare(`
      INSERT INTO measurements (
        device_id, wifi_rssi, rco2, pm01, pm02, pm10, pm02_compensated,
        pm003_count, pm005_count, pm01_count, pm02_count, pm50_count, pm10_count,
        atmp, atmp_compensated, rhum, rhum_compensated,
        tvoc_index, tvoc_raw, nox_index, nox_raw, boot, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      deviceId,
      data.wifi || null,
      data.rco2 || null,
      data.pm01 || null,
      data.pm02 || null,
      data.pm10 || null,
      data.pm02Compensated || null,
      data.pm003Count || null,
      data.pm005Count || null,
      data.pm01Count || null,
      data.pm02Count || null,
      data.pm50Count || null,
      data.pm10Count || null,
      data.atmp || null,
      data.atmpCompensated || null,
      data.rhum || null,
      data.rhumCompensated || null,
      data.tvocIndex || null,
      data.tvocRaw || null,
      data.noxIndex || null,
      data.noxRaw || null,
      data.boot || null,
      timestamp
    );
  }

  /**
   * Get latest measurement for a device
   */
  getLatestMeasurement(deviceId) {
    const stmt = this.db.prepare(`
      SELECT * FROM measurements 
      WHERE device_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    return stmt.get(deviceId);
  }

  /**
   * Get measurements for a device with time range
   */
  getMeasurements(deviceId, startTime = null, endTime = null, limit = 1000) {
    let query = 'SELECT * FROM measurements WHERE device_id = ?';
    const params = [deviceId];

    if (startTime) {
      query += ' AND timestamp >= ?';
      params.push(startTime);
    }

    if (endTime) {
      query += ' AND timestamp <= ?';
      params.push(endTime);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get device statistics
   */
  getDeviceStats(deviceId) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_measurements,
        MIN(timestamp) as first_measurement,
        MAX(timestamp) as last_measurement,
        AVG(rco2) as avg_co2,
        AVG(pm02) as avg_pm25,
        AVG(atmp) as avg_temp,
        AVG(rhum) as avg_humidity
      FROM measurements 
      WHERE device_id = ?
    `);
    return stmt.get(deviceId);
  }

  /**
   * Log an event
   */
  logEvent(deviceId, eventType, eventData = null) {
    const timestamp = getISTTimestamp();
    const stmt = this.db.prepare(`
      INSERT INTO events (device_id, event_type, event_data, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(deviceId, eventType, JSON.stringify(eventData), timestamp);
  }

  /**
   * Clean old data based on retention policy
   */
  cleanOldData() {
    const measurementDate = new Date();
    measurementDate.setDate(measurementDate.getDate() - config.dataRetention.measurements);
    
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - config.dataRetention.events);

    const measurementStmt = this.db.prepare('DELETE FROM measurements WHERE timestamp < ?');
    const eventStmt = this.db.prepare('DELETE FROM events WHERE timestamp < ?');

    const measurementsDeleted = measurementStmt.run(measurementDate.toISOString()).changes;
    const eventsDeleted = eventStmt.run(eventDate.toISOString()).changes;

    console.log(`Cleanup: Removed ${measurementsDeleted} old measurements and ${eventsDeleted} old events`);
    return { measurementsDeleted, eventsDeleted };
  }

  // ============================================================================
  // User Management Methods
  // ============================================================================

  /**
   * Create a new user
   */
  createUser(username, passwordHash, email = null, role = 'user') {
    const stmt = this.db.prepare(`
      INSERT INTO users (username, password_hash, email, role)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(username, passwordHash, email, role);
  }

  /**
   * Get user by username
   */
  getUserByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    const stmt = this.db.prepare('SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?');
    return stmt.get(userId);
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers() {
    const stmt = this.db.prepare('SELECT id, username, email, role, created_at, last_login FROM users ORDER BY created_at DESC');
    return stmt.all();
  }

  /**
   * Update user last login
   */
  updateLastLogin(userId) {
    const timestamp = getISTTimestamp();
    const stmt = this.db.prepare('UPDATE users SET last_login = ? WHERE id = ?');
    return stmt.run(timestamp, userId);
  }

  /**
   * Delete user
   */
  deleteUser(userId) {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    return stmt.run(userId);
  }

  /**
   * Assign device to user
   */
  assignDeviceToUser(deviceId, userId) {
    const stmt = this.db.prepare('UPDATE devices SET user_id = ? WHERE device_id = ?');
    return stmt.run(userId, deviceId);
  }

  /**
   * Unassign device from user
   */
  unassignDevice(deviceId) {
    const stmt = this.db.prepare('UPDATE devices SET user_id = NULL WHERE device_id = ?');
    return stmt.run(deviceId);
  }

  /**
   * Get devices assigned to user
   */
  getDevicesByUserId(userId) {
    const stmt = this.db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen DESC');
    return stmt.all(userId);
  }

  /**
   * Get unassigned devices (admin only)
   */
  getUnassignedDevices() {
    const stmt = this.db.prepare('SELECT * FROM devices WHERE user_id IS NULL ORDER BY last_seen DESC');
    return stmt.all();
  }

  /**
   * Update device custom name
   */
  updateDeviceCustomName(deviceId, customName) {
    const stmt = this.db.prepare('UPDATE devices SET custom_name = ? WHERE device_id = ?');
    return stmt.run(customName, deviceId);
  }

  /**
   * Check if user owns device
   */
  userOwnsDevice(userId, deviceId) {
    const stmt = this.db.prepare('SELECT 1 FROM devices WHERE device_id = ? AND user_id = ?');
    return stmt.get(deviceId, userId) !== undefined;
  }

  // ============================================================================
  // Firmware Management Methods
  // ============================================================================

  /**
   * Add firmware upload
   */
  addFirmware(version, filename, filePath, fileSize, uploadedBy, notes = null) {
    const stmt = this.db.prepare(`
      INSERT INTO firmware (version, filename, file_path, file_size, uploaded_by, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(version, filename, filePath, fileSize, uploadedBy, notes);
  }

  /**
   * Get firmware by version
   */
  getFirmwareByVersion(version) {
    const stmt = this.db.prepare('SELECT * FROM firmware WHERE version = ?');
    return stmt.get(version);
  }

  /**
   * Get latest firmware
   */
  getLatestFirmware() {
    const stmt = this.db.prepare('SELECT * FROM firmware ORDER BY uploaded_at DESC LIMIT 1');
    return stmt.get();
  }

  /**
   * Get all firmware versions
   */
  getAllFirmware() {
    const stmt = this.db.prepare('SELECT * FROM firmware ORDER BY uploaded_at DESC');
    return stmt.all();
  }

  /**
   * Delete firmware
   */
  deleteFirmware(id) {
    const stmt = this.db.prepare('DELETE FROM firmware WHERE id = ?');
    return stmt.run(id);
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('✓ Database connection closed');
    }
  }
}

// Export singleton instance
const database = new RosaIQDatabase();
module.exports = database;

// If run directly, initialize database
if (require.main === module) {
  database.initialize();
  console.log('Database tables created successfully!');
}
