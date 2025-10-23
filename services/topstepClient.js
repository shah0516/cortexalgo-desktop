// services/topstepClient.js
// TopstepX Client Orchestrator - Coordinates all TopstepX services

const authService = require('./authService');
const signalRService = require('./signalRService');
const accountManager = require('./accountManager');
const mockAccountsService = require('../dev/mockAccountsService');

let isInitialized = false;
let eventCallbacks = {
  onAccountsLoaded: null,
  onFill: null,
  onAccountUpdate: null,
  onConnectionStateChanged: null
};

/**
 * Initialize TopstepX client with optional development mode
 * @param {object} credentials - {username, apiKey} or 'MOCK' for development
 * @param {object} callbacks - Event callback functions
 * @param {boolean} developmentMode - Use mock data instead of real API calls
 */
async function initialize(credentials, callbacks = {}, developmentMode = false) {
  if (isInitialized) {
    console.warn('[TopstepClient] Already initialized');
    return;
  }

  // Check if using mock credentials for development
  console.log('[TopstepClient] DEBUG: credentials =', credentials, 'developmentMode =', developmentMode);
  
  if (credentials === 'MOCK' || developmentMode || 
      (credentials && credentials.username === 'dev_user@cortexalgo.com')) {
    isDevelopmentMode = true;
    console.log('[TopstepClient] 🚧 DEVELOPMENT MODE - Using mock data');
  } else {
    console.log('[TopstepClient] Production mode detected');
  }

  console.log('[TopstepClient] Initializing...');

  // Store callbacks
  eventCallbacks = { ...eventCallbacks, ...callbacks };

  try {
    let accounts;
    
    if (isDevelopmentMode) {
      // === DEVELOPMENT MODE ===
      console.log('[TopstepClient] Using mock authentication and accounts...');
      
      // Mock authentication
      await mockAccountsService.mockAuthenticate();
      
      // Get mock accounts
      accounts = mockAccountsService.generateMockAccounts();
      
      console.log(`[TopstepClient] Mock accounts generated: ${accounts.length}`);
    } else {
      // === PRODUCTION MODE ===
      // Initialize auth service with credentials
      authService.initialize(credentials);

      // Authenticate and get token
      console.log('[TopstepClient] Authenticating...');
      const token = await authService.getAccessToken();

      // Fetch active accounts
      console.log('[TopstepClient] Fetching accounts...');
      accounts = await authService.getActiveAccounts(token);

      if (!accounts || accounts.length === 0) {
        throw new Error('No active accounts found');
      }
    }

    // Initialize account manager with accounts (mock or real)
    accountManager.initializeAccounts(accounts);

    // Enable master kill switch by default
    accountManager.setMasterKillSwitch(true);

    // Notify main process that accounts are loaded
    if (eventCallbacks.onAccountsLoaded) {
      eventCallbacks.onAccountsLoaded(accountManager.getAllAccounts());
    }

    if (isDevelopmentMode) {
      // === DEVELOPMENT MODE - Mock SignalR ===
      console.log('[TopstepClient] Starting mock live data updates...');
      
      // Start mock live updates
      mockUpdateCleanup = mockAccountsService.startMockLiveUpdates(
        handleAccountUpdate,
        handleFill,
        accounts
      );
      
      // Simulate connection success
      if (eventCallbacks.onConnectionStateChanged) {
        eventCallbacks.onConnectionStateChanged('connected');
      }
    } else {
      // === PRODUCTION MODE - Real SignalR ===
      // Build and start User Hub connection
      console.log('[TopstepClient] Connecting to User Hub...');
      const token = await authService.getAccessToken(); // Get token again
      const userHub = signalRService.buildUserHubConnection(token);

      // Register SignalR event handlers
      signalRService.registerEventHandlers(userHub, {
        onFill: handleFill,
        onAccountUpdate: handleAccountUpdate,
        onPositionUpdate: handlePositionUpdate,
        onOrderUpdate: handleOrderUpdate
      });

      // Start connection
      const connected = await signalRService.startConnection(userHub);

      if (connected) {
        console.log('[TopstepClient] Successfully connected to TopstepX User Hub');
        if (eventCallbacks.onConnectionStateChanged) {
          eventCallbacks.onConnectionStateChanged('connected');
        }
      } else {
        console.warn('[TopstepClient] Failed to connect to User Hub, but will auto-retry');
        if (eventCallbacks.onConnectionStateChanged) {
          eventCallbacks.onConnectionStateChanged('disconnected');
        }
      }
    }

    isInitialized = true;
    console.log('[TopstepClient] Initialization complete');

  } catch (error) {
    console.error('[TopstepClient] Initialization failed:', error);
    if (eventCallbacks.onConnectionStateChanged) {
      eventCallbacks.onConnectionStateChanged('error');
    }
    throw error;
  }
}

/**
 * Handle fill event from SignalR
 * @param {object} fillData - Fill data from User Hub
 */
function handleFill(fillData) {
  console.log('[TopstepClient] Fill received:', fillData);

  // Add fill to account manager
  if (fillData.accountId) {
    accountManager.addFill(fillData.accountId, fillData);
  }

  // Notify main process
  if (eventCallbacks.onFill) {
    eventCallbacks.onFill(fillData);
  }
}

/**
 * Handle account update from SignalR
 * @param {object} accountData - Account data from User Hub
 */
function handleAccountUpdate(accountData) {
  console.log('[TopstepClient] Account update received:', accountData);

  // Update account in manager
  if (accountData.accountId) {
    // Extract PNL if available
    if (accountData.realizedPnl !== undefined) {
      accountManager.updatePnl(accountData.accountId, accountData.realizedPnl);
    }

    accountManager.updateAccount(accountData.accountId, accountData);
  }

  // Notify main process
  if (eventCallbacks.onAccountUpdate) {
    eventCallbacks.onAccountUpdate(accountData);
  }
}

/**
 * Handle position update from SignalR
 * @param {object} positionData - Position data from User Hub
 */
function handlePositionUpdate(positionData) {
  console.log('[TopstepClient] Position update:', positionData);

  if (positionData.accountId) {
    const account = accountManager.getAccount(positionData.accountId);
    if (account) {
      // Update account positions
      accountManager.updateAccount(positionData.accountId, {
        openPositions: positionData.positions || account.openPositions
      });
    }
  }
}

/**
 * Handle order update from SignalR
 * @param {object} orderData - Order data from User Hub
 */
function handleOrderUpdate(orderData) {
  console.log('[TopstepClient] Order update:', orderData);
  // Could track working orders if needed
}

/**
 * Get all accounts
 * @returns {Array} Array of account objects
 */
function getAccounts() {
  return accountManager.getAllAccounts();
}

/**
 * Get cumulative PNL across all accounts
 * @returns {number} Total PNL
 */
function getCumulativePnl() {
  return accountManager.getCumulativePnl();
}

/**
 * Set master kill switch
 * @param {boolean} enabled - Trading enabled/disabled globally
 */
function setMasterKillSwitch(enabled) {
  accountManager.setMasterKillSwitch(enabled);
  console.log(`[TopstepClient] Master kill switch: ${enabled ? 'ON (trading enabled)' : 'OFF (all trading disabled)'}`);
}

/**
 * Get master kill switch status
 * @returns {boolean} Master kill switch status
 */
function getMasterKillSwitch() {
  return accountManager.getMasterKillSwitch();
}

/**
 * Enable/disable trading for a specific account
 * @param {number} accountId - Account ID
 * @param {boolean} enabled - Trading enabled/disabled
 */
function setAccountTrading(accountId, enabled) {
  return accountManager.setAccountTrading(accountId, enabled);
}

/**
 * Check if trading is allowed for an account
 * @param {number} accountId - Account ID
 * @returns {boolean} Can trade
 */
function canTrade(accountId) {
  return accountManager.canTrade(accountId);
}

/**
 * Get trading status for all accounts
 * @returns {object} Trading status object
 */
function getTradingStatus() {
  return accountManager.getTradingStatus();
}

/**
 * Shutdown client (cleanup)
 */
async function shutdown() {
  console.log('[TopstepClient] Shutting down...');

  const userHub = signalRService.getUserHubConnection();
  if (userHub) {
    await signalRService.stopConnection(userHub);
  }

  accountManager.reset();
  authService.clearToken();
  isInitialized = false;

  console.log('[TopstepClient] Shutdown complete');
}

module.exports = {
  initialize,
  getAccounts,
  getCumulativePnl,
  setMasterKillSwitch,
  getMasterKillSwitch,
  setAccountTrading,
  canTrade,
  getTradingStatus,
  shutdown
};
