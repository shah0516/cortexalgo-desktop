// Development Environment Configuration
// This file contains development-specific settings and configurations

module.exports = {
  // Development mode detection
  isDevelopmentMode: () => {
    return process.env.NODE_ENV === 'development' || 
           process.argv.includes('--dev') ||
           !require('electron').app.isPackaged;
  },

  // Mock data settings
  mockData: {
    accountCount: 5,
    updateInterval: 15000, // 15 seconds
    fillInterval: 30000,   // 30 seconds
    enableLiveUpdates: true
  },

  // Development credentials (for testing only)
  devCredentials: {
    username: 'dev_user@cortexalgo.com',
    apiKey: 'dev-key-12345'
  },

  // Debug settings
  debug: {
    enableConsoleLogging: true,
    logLevel: 'debug' // 'debug', 'info', 'warn', 'error'
  }
};