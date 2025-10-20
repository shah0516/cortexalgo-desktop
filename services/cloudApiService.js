// services/cloudApiService.js
// CortexAlgo Cloud API Service - Fleet Management & Telemetry

const axios = require('axios');
const https = require('https');
const io = require('socket.io-client');
const config = require('../config');
const securityService = require('./securityService');

// Module-level state
let socket = null;
let accessToken = null;
let refreshToken = null;
let botId = null;
let deviceFingerprint = null;
let isConnected = false;
let telemetryInterval = null;
let heartbeatInterval = null;
let tokenRefreshInterval = null;

// Certificate pinning (updated when certificate rotates)
let expectedCertFingerprint = null; // Set to null to disable pinning initially

// Rate limiters for different endpoints
const rateLimiters = {
  activation: new securityService.RateLimiter(5, 60 * 60 * 1000), // 5 per hour
  telemetry: new securityService.RateLimiter(100, 15 * 60 * 1000), // 100 per 15 min
  tokenRefresh: new securityService.RateLimiter(20, 60 * 60 * 1000) // 20 per hour
};

// Event handlers
let eventHandlers = {
  onCommand: null,
  onConnectionStateChanged: null
};

/**
 * Initialize the cloud API service
 * @param {Object} handlers - Event handlers {onCommand, onConnectionStateChanged}
 */
function initialize(handlers) {
  eventHandlers = { ...eventHandlers, ...handlers };
  console.log('[CloudAPI] Service initialized');
}

/**
 * Create HTTPS agent with certificate pinning
 * @returns {https.Agent} Configured HTTPS agent
 */
function createSecureAgent() {
  return new https.Agent({
    checkServerIdentity: (hostname, cert) => {
      // Skip pinning if no expected fingerprint is set
      if (!expectedCertFingerprint) {
        return undefined; // Use default verification
      }

      // Verify certificate fingerprint
      const fingerprint = securityService.getCertificateFingerprint({ getPeerCertificate: () => cert });

      if (fingerprint !== expectedCertFingerprint) {
        const error = new Error(
          `Certificate fingerprint mismatch! Expected: ${expectedCertFingerprint}, Got: ${fingerprint}`
        );
        error.code = 'CERT_PINNING_FAILED';
        throw error;
      }

      console.log('[CloudAPI] Certificate pinning validated');
      return undefined; // Certificate is valid
    }
  });
}

/**
 * Activate bot with single-use activation token
 * @param {string} activationToken - Single-use activation token from admin
 * @param {string} fingerprint - Device fingerprint for machine-bound sessions
 * @returns {Promise<Object>} {success, botId, accessToken, refreshToken, error}
 */
async function activateBot(activationToken, fingerprint) {
  console.log('[CloudAPI] Activating bot with token...');
  console.log(`[CloudAPI] Device fingerprint: ${fingerprint.substring(0, 16)}...`);

  try {
    // Check rate limit
    try {
      rateLimiters.activation.checkLimit();
    } catch (error) {
      console.warn('[CloudAPI] Activation rate limit exceeded:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    // Store device fingerprint
    deviceFingerprint = fingerprint;

    const response = await axios.post(
      `${config.ADMIN_API_URL}/v1/auth/activate`,
      {
        activationToken,
        deviceFingerprint: fingerprint
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        httpsAgent: createSecureAgent()
      }
    );

    if (response.data && response.data.botId && response.data.accessToken && response.data.refreshToken) {
      console.log('[CloudAPI] Activation successful');
      console.log(`[CloudAPI] Bot ID: ${response.data.botId}`);

      // Store tokens and bot ID
      botId = response.data.botId;
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;

      return {
        success: true,
        botId: response.data.botId,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken
      };
    }

    throw new Error('Invalid activation response');
  } catch (error) {
    console.error('[CloudAPI] Activation failed:', error.response ? error.response.data : error.message);

    let errorMessage = 'Activation failed';
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = 'Invalid or expired activation token';
      } else if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to CortexAlgo cloud. Please check your internet connection.';
    } else if (error.message && error.message.includes('certificate')) {
      errorMessage = 'SSL certificate validation failed. Possible security threat.';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} currentRefreshToken - Current refresh token
 * @returns {Promise<Object>} {success, accessToken, refreshToken, error}
 */
async function refreshAccessToken(currentRefreshToken) {
  console.log('[CloudAPI] Refreshing access token...');

  try {
    // Check rate limit
    try {
      rateLimiters.tokenRefresh.checkLimit();
    } catch (error) {
      console.warn('[CloudAPI] Token refresh rate limit exceeded:', error.message);
      return {
        success: false,
        error: error.message
      };
    }

    const response = await axios.post(
      `${config.ADMIN_API_URL}/v1/auth/refresh`,
      { refreshToken: currentRefreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceFingerprint || ''
        },
        timeout: 10000,
        httpsAgent: createSecureAgent()
      }
    );

    if (response.data && response.data.accessToken) {
      console.log('[CloudAPI] Token refresh successful');

      // Update access token (refresh token stays the same)
      accessToken = response.data.accessToken;

      return {
        success: true,
        accessToken: response.data.accessToken,
        refreshToken: currentRefreshToken // Refresh token doesn't change
      };
    }

    throw new Error('Invalid refresh response');
  } catch (error) {
    console.error('[CloudAPI] Token refresh failed:', error.response ? error.response.data : error.message);

    return {
      success: false,
      error: error.response ? error.response.data.message : 'Token refresh failed'
    };
  }
}

/**
 * Connect to WebSocket server
 * @param {string} token - Access token for authentication
 * @returns {Promise<boolean>} Connection success status
 */
async function connectWebSocket(token) {
  console.log('[CloudAPI] Connecting to WebSocket...');

  return new Promise((resolve, reject) => {
    try {
      // Disconnect existing socket if any
      if (socket && socket.connected) {
        console.log('[CloudAPI] Disconnecting existing WebSocket...');
        socket.disconnect();
      }

      // Create new socket connection
      console.log('[CloudAPI] Connecting to:', config.ADMIN_WS_URL);
      console.log('[CloudAPI] With token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

      socket = io(config.ADMIN_WS_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: Infinity,
        timeout: 10000
      });

      console.log('[CloudAPI] Socket.IO client created, waiting for connection...');

      // Connection successful
      socket.on('connect', () => {
        console.log(`[CloudAPI] WebSocket connected. Socket ID: ${socket.id}`);
        isConnected = true;

        if (eventHandlers.onConnectionStateChanged) {
          eventHandlers.onConnectionStateChanged('connected');
        }

        // Start heartbeat
        startHeartbeat();
      });

      // Welcome message from server
      socket.on('connected', (data) => {
        console.log('[CloudAPI] Welcome message:', data);
      });

      // Command received from server
      socket.on('command', (commandData) => {
        console.log('[CloudAPI] Command received:', commandData);

        if (eventHandlers.onCommand) {
          eventHandlers.onCommand(commandData);
        }

        // Send acknowledgment
        socket.emit('command_ack', {
          commandId: commandData.commandId,
          timestamp: new Date().toISOString()
        });
      });

      // Trade directive received from cloud-engine
      socket.on('trade_directive', async (data) => {
        const { directiveId, virtualBotId, strategyConfigId, physicalBotId, accountId, symbol, action, price, contracts, reason, timestamp } = data;

        console.log('[CloudAPI] 📥 Trade directive received:', {
          directiveId,
          accountId,
          action,
          symbol,
          price,
          contracts,
          timestamp
        });

        // Forward to main process for handling
        if (eventHandlers.onTradeDirective) {
          eventHandlers.onTradeDirective(data);
        }

        // Send acknowledgment for RTT measurement
        if (socket && isConnected) {
          socket.emit('directive_ack', {
            directiveId,
            topstepLatencyMs: null // TODO: Add actual TopstepX execution latency when order execution is implemented
          });
        }
      });

      // Heartbeat acknowledgment
      socket.on('heartbeat_ack', (data) => {
        console.log('[CloudAPI] Heartbeat acknowledged');
      });

      // Connection errors
      socket.on('connect_error', (error) => {
        console.error('[CloudAPI] WebSocket connection error:', error.message);
        isConnected = false;

        if (eventHandlers.onConnectionStateChanged) {
          eventHandlers.onConnectionStateChanged('error');
        }

        reject(error);
      });

      // Disconnection
      socket.on('disconnect', (reason) => {
        console.warn('[CloudAPI] WebSocket disconnected:', reason);
        isConnected = false;
        stopHeartbeat();

        if (eventHandlers.onConnectionStateChanged) {
          eventHandlers.onConnectionStateChanged('disconnected');
        }
      });

      // Reconnection attempt
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[CloudAPI] WebSocket reconnection attempt ${attemptNumber}...`);

        if (eventHandlers.onConnectionStateChanged) {
          eventHandlers.onConnectionStateChanged('reconnecting');
        }
      });

      // Reconnection successful
      socket.on('reconnect', (attemptNumber) => {
        console.log(`[CloudAPI] WebSocket reconnected after ${attemptNumber} attempt(s)`);
        isConnected = true;

        if (eventHandlers.onConnectionStateChanged) {
          eventHandlers.onConnectionStateChanged('connected');
        }

        // Restart heartbeat
        startHeartbeat();
      });

      // Wait for connection (with timeout)
      const connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      socket.once('connect', () => {
        clearTimeout(connectionTimeout);
        resolve(true);
      });

    } catch (error) {
      console.error('[CloudAPI] WebSocket connection failed:', error);
      reject(error);
    }
  });
}

/**
 * Disconnect from WebSocket server
 */
function disconnectWebSocket() {
  if (socket) {
    console.log('[CloudAPI] Disconnecting WebSocket...');
    stopHeartbeat();
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

/**
 * Start sending periodic heartbeats
 */
function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval

  heartbeatInterval = setInterval(() => {
    if (socket && isConnected) {
      console.log('[CloudAPI] Sending heartbeat...');
      socket.emit('heartbeat', {
        timestamp: new Date().toISOString()
      });
    }
  }, config.HEARTBEAT_INTERVAL_MS);

  console.log('[CloudAPI] Heartbeat started');
}

/**
 * Stop heartbeat
 */
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[CloudAPI] Heartbeat stopped');
  }
}

/**
 * Send telemetry data to cloud
 * @param {Array} accounts - Array of account data objects
 * @returns {Promise<boolean>} Success status
 */
async function sendTelemetry(accounts) {
  if (!accessToken) {
    console.error('[CloudAPI] Cannot send telemetry - no access token');
    return false;
  }

  if (!deviceFingerprint) {
    console.error('[CloudAPI] Cannot send telemetry - no device fingerprint');
    return false;
  }

  try {
    // Check rate limit
    try {
      rateLimiters.telemetry.checkLimit();
    } catch (error) {
      console.warn('[CloudAPI] Telemetry rate limit exceeded:', error.message);
      return false;
    }

    const telemetryData = {
      accounts: accounts.map(account => ({
        accountId: String(account.id || account.accountId || ''),
        accountName: account.name || account.accountName || String(account.id || ''),
        balance: account.balance || account.cashBalance || 0,
        dailyPnl: account.pnl || account.dailyPnl || 0,
        openPositions: Array.isArray(account.openPositions) ? account.openPositions.length : (account.openPositions || 0),
        isTradingEnabled: account.tradingEnabled !== false
      }))
    };

    // Sign the request
    const signedRequest = securityService.signRequest(telemetryData, accessToken);

    const response = await axios.post(
      `${config.ADMIN_API_URL}/v1/ingest/telemetry`,
      signedRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Device-Fingerprint': deviceFingerprint,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        httpsAgent: createSecureAgent()
      }
    );

    if (response.status === 204) {
      console.log(`[CloudAPI] Telemetry sent successfully (${accounts.length} accounts)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[CloudAPI] Telemetry send failed:', error.response ? error.response.data : error.message);
    return false;
  }
}

/**
 * Start periodic telemetry reporting
 * @param {Function} getAccountsFunc - Function that returns current account data
 */
function startTelemetryReporting(getAccountsFunc) {
  stopTelemetryReporting(); // Clear any existing interval

  // Send initial telemetry immediately
  const accounts = getAccountsFunc();
  if (accounts && accounts.length > 0) {
    sendTelemetry(accounts);
  }

  // Start periodic reporting
  telemetryInterval = setInterval(() => {
    const accounts = getAccountsFunc();
    if (accounts && accounts.length > 0) {
      sendTelemetry(accounts);
    }
  }, config.TELEMETRY_INTERVAL_MS);

  console.log('[CloudAPI] Telemetry reporting started');
}

/**
 * Stop telemetry reporting
 */
function stopTelemetryReporting() {
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
    console.log('[CloudAPI] Telemetry reporting stopped');
  }
}

/**
 * Start periodic token refresh
 * @param {Function} onTokenRefreshed - Callback with new tokens {accessToken, refreshToken}
 */
function startTokenRefresh(onTokenRefreshed) {
  stopTokenRefresh(); // Clear any existing interval

  tokenRefreshInterval = setInterval(async () => {
    if (refreshToken) {
      console.log('[CloudAPI] Refreshing token...');
      const result = await refreshAccessToken(refreshToken);

      if (result.success) {
        // Update tokens
        accessToken = result.accessToken;
        refreshToken = result.refreshToken;

        // Notify caller
        if (onTokenRefreshed) {
          onTokenRefreshed({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
          });
        }

        // NOTE: WebSocket does NOT need to reconnect after token refresh
        // Socket.IO only validates JWT during initial connection (auth middleware)
        // The refreshed token is only needed for HTTP API calls (telemetry, etc.)
        // Keeping the WebSocket connected avoids unnecessary disconnections
      } else {
        console.error('[CloudAPI] Token refresh failed. User may need to reactivate.');
      }
    }
  }, config.TOKEN_REFRESH_INTERVAL_MS);

  console.log('[CloudAPI] Token refresh interval started');
}

/**
 * Stop token refresh
 */
function stopTokenRefresh() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
    console.log('[CloudAPI] Token refresh stopped');
  }
}

/**
 * Get current connection status
 * @returns {boolean} Connection status
 */
function getConnectionStatus() {
  return isConnected;
}

/**
 * Get current bot ID
 * @returns {string|null} Bot ID
 */
function getBotId() {
  return botId;
}

/**
 * Set tokens (used when loading from storage)
 * @param {Object} tokens - {accessToken, refreshToken, botId, deviceFingerprint}
 */
function setTokens(tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  botId = tokens.botId;
  deviceFingerprint = tokens.deviceFingerprint;
  console.log('[CloudAPI] Tokens set from storage');
  if (deviceFingerprint) {
    console.log(`[CloudAPI] Device fingerprint: ${deviceFingerprint.substring(0, 16)}...`);
  }
}

/**
 * Set device fingerprint (used when loading from storage)
 * @param {string} fingerprint - Device fingerprint
 */
function setDeviceFingerprint(fingerprint) {
  deviceFingerprint = fingerprint;
  console.log(`[CloudAPI] Device fingerprint set: ${fingerprint.substring(0, 16)}...`);
}

/**
 * Get current device fingerprint
 * @returns {string|null} Device fingerprint
 */
function getDeviceFingerprint() {
  return deviceFingerprint;
}

/**
 * Set expected certificate fingerprint for pinning
 * @param {string} fingerprint - Expected certificate fingerprint (sha256 base64)
 */
function setExpectedCertificateFingerprint(fingerprint) {
  expectedCertFingerprint = fingerprint;
  if (fingerprint) {
    console.log(`[CloudAPI] Certificate pinning enabled: ${fingerprint.substring(0, 20)}...`);
  } else {
    console.log('[CloudAPI] Certificate pinning disabled');
  }
}

/**
 * Get rate limiter stats
 * @returns {Object} Rate limiter statistics
 */
function getRateLimiterStats() {
  return {
    activation: rateLimiters.activation.getStats(),
    telemetry: rateLimiters.telemetry.getStats(),
    tokenRefresh: rateLimiters.tokenRefresh.getStats()
  };
}

/**
 * Get current access token
 * @returns {string|null} Access token
 */
function getAccessToken() {
  return accessToken;
}

/**
 * Get current refresh token
 * @returns {string|null} Refresh token
 */
function getRefreshToken() {
  return refreshToken;
}

/**
 * Clear all tokens and disconnect
 */
function clearTokens() {
  accessToken = null;
  refreshToken = null;
  botId = null;
  deviceFingerprint = null;
  disconnectWebSocket();
  stopTelemetryReporting();
  stopTokenRefresh();
  console.log('[CloudAPI] Tokens cleared');
}

module.exports = {
  initialize,
  activateBot,
  refreshAccessToken,
  connectWebSocket,
  disconnectWebSocket,
  sendTelemetry,
  startTelemetryReporting,
  stopTelemetryReporting,
  startTokenRefresh,
  stopTokenRefresh,
  getConnectionStatus,
  getBotId,
  setTokens,
  setDeviceFingerprint,
  getDeviceFingerprint,
  setExpectedCertificateFingerprint,
  getRateLimiterStats,
  getAccessToken,
  getRefreshToken,
  clearTokens
};
