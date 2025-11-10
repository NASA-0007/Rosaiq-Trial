/**
 * RosaIQ Air Quality Server Configuration
 * 
 * Customize these settings for your deployment
 */

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'rosaiq-secret-key-change-in-production-' + Math.random().toString(36),
  },

  // Database configuration
  database: {
    // For Render: use persistent disk path
    // For local dev: use current directory
    path: process.env.DB_PATH || './rosaiq-airquality.db',
  },

  // Data retention (days)
  dataRetention: {
    measurements: 365, // Keep measurement data for 1 year
    events: 90,        // Keep event logs for 90 days
  },

  // API configuration
  api: {
    enableAuth: process.env.ENABLE_AUTH === 'true' || false,
    apiKey: process.env.API_KEY || null,
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,     // Max 100 requests per minute per IP
    },
  },

  // Device configuration defaults
  deviceDefaults: {
    country: 'US',
    pmStandard: 'ugm3',
    ledBarMode: 'pm',
    abcDays: 8,
    tvocLearningOffset: 12,
    noxLearningOffset: 12,
    mqttBrokerUrl: '',
    temperatureUnit: 'c',
    configurationControl: 'local',
    postDataToAirGradient: false,
    ledBarBrightness: 100,
    displayBrightness: 100,
  },

  // Company branding
  branding: {
    companyName: 'RosaIQ',
    dashboardTitle: 'RosaIQ Air Quality Monitor',
    logoUrl: '/logo.png', // Optional: Add your logo to public folder
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    logToFile: false,
    logFilePath: './rosaiq-server.log',
  },
};
