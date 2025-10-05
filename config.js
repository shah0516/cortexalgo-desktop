// config.js - Application Configuration

module.exports = {
  // ========== TopstepX Configuration ==========

  // TopstepX API Base URL
  API_ENDPOINT: 'https://api.topstepx.com',

  // TopstepX User Hub URL (SignalR for real-time account updates)
  USER_HUB_URL: 'https://rtc.topstepx.com/hubs/user',

  // TopstepX Market Hub URL (SignalR for market data - if needed later)
  MARKET_HUB_URL: 'https://rtc.topstepx.com/hubs/market',

  // Token lifetime configuration
  TOKEN_LIFETIME_MS: 23.5 * 60 * 60 * 1000, // 23.5 hours with 30min buffer

  // Connection settings
  RECONNECT_INTERVAL_MS: 5000, // 5 seconds
  KEEP_ALIVE_INTERVAL_MS: 10000, // 10 seconds

  // ========== CortexAlgo Cloud API Configuration ==========

  // Admin API Base URL (for HTTP requests)
  // Development: Uses 127.0.0.1 (IPv4) to avoid DNS resolution issues
  // Production: Set ADMIN_API_URL env var to your cloud endpoint (e.g., https://api.cortexalgo.com)
  ADMIN_API_URL: process.env.ADMIN_API_URL || 'http://127.0.0.1:3000',

  // Admin API WebSocket URL (for real-time communication)
  // Development: Uses 127.0.0.1 (IPv4) to avoid DNS resolution issues
  // Production: Set ADMIN_WS_URL env var to your cloud endpoint (e.g., wss://api.cortexalgo.com)
  ADMIN_WS_URL: process.env.ADMIN_WS_URL || 'http://127.0.0.1:3000',

  // Telemetry reporting interval (30 seconds)
  TELEMETRY_INTERVAL_MS: 30 * 1000,

  // Heartbeat interval (25 seconds, must be less than server timeout of 30s)
  HEARTBEAT_INTERVAL_MS: 25 * 1000,

  // JWT token refresh interval (refresh 5 minutes before expiry)
  TOKEN_REFRESH_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes (tokens expire in 15min)
};
