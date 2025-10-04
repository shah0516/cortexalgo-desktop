// config.js - TopstepX API Configuration

module.exports = {
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
};
