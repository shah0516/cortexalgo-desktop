// services/signalRService.js
// TopstepX User Hub SignalR Service - Real-time Account Updates

const signalR = require('@microsoft/signalr');
const config = require('../config');

let userHubConnection = null;
let eventHandlers = {
  onFill: null,
  onAccountUpdate: null,
  onPositionUpdate: null,
  onOrderUpdate: null
};

/**
 * Builds the User Hub SignalR connection
 * @param {string} authToken - JWT authentication token
 * @returns {object} SignalR HubConnection
 */
function buildUserHubConnection(authToken) {
  if (!authToken) {
    throw new Error('Auth token required to build User Hub connection');
  }

  const hubUrlWithToken = `${config.USER_HUB_URL}?access_token=${authToken}`;
  console.log('[SignalR] Building User Hub connection...');

  userHubConnection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrlWithToken, {
      skipNegotiation: true,
      transport: signalR.HttpTransportType.WebSockets,
    })
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: () => config.RECONNECT_INTERVAL_MS
    })
    .configureLogging(signalR.LogLevel.Information)
    .build();

  // Setup connection event handlers
  userHubConnection.onclose(async (error) => {
    console.warn('[SignalR] User Hub connection closed.', error ? `Error: ${error}` : '');
  });

  userHubConnection.onreconnecting((error) => {
    console.warn('[SignalR] User Hub reconnecting...', error ? `Error: ${error}` : '');
  });

  userHubConnection.onreconnected((connectionId) => {
    console.log(`[SignalR] User Hub reconnected. Connection ID: ${connectionId}`);
  });

  return userHubConnection;
}

/**
 * Starts the SignalR connection
 * @param {object} hubConnection - SignalR HubConnection object
 * @returns {Promise<boolean>} Success status
 */
async function startConnection(hubConnection) {
  if (!hubConnection) {
    console.error('[SignalR] Cannot start connection - connection object is null');
    return false;
  }

  try {
    console.log('[SignalR] Starting User Hub connection...');
    await hubConnection.start();
    console.log(`[SignalR] User Hub connected! Connection ID: ${hubConnection.connectionId}`);
    return true;
  } catch (error) {
    console.error('[SignalR] Failed to start connection:', error);
    return false;
  }
}

/**
 * Stops the SignalR connection
 * @param {object} hubConnection - SignalR HubConnection object
 */
async function stopConnection(hubConnection) {
  if (hubConnection) {
    try {
      await hubConnection.stop();
      console.log('[SignalR] User Hub connection stopped');
    } catch (error) {
      console.error('[SignalR] Error stopping connection:', error);
    }
  }
}

/**
 * Registers event handlers for SignalR messages
 * @param {object} hubConnection - SignalR HubConnection object
 * @param {object} handlers - Object with handler functions
 */
function registerEventHandlers(hubConnection, handlers) {
  if (!hubConnection) {
    console.error('[SignalR] Cannot register handlers - connection is null');
    return;
  }

  eventHandlers = { ...eventHandlers, ...handlers };

  // Register SignalR server method handlers
  // These method names should match what TopstepX User Hub sends

  if (handlers.onFill) {
    hubConnection.on('Fill', (fillData) => {
      console.log('[SignalR] Fill received:', fillData);
      handlers.onFill(fillData);
    });
  }

  if (handlers.onAccountUpdate) {
    hubConnection.on('AccountUpdate', (accountData) => {
      console.log('[SignalR] Account update received:', accountData);
      handlers.onAccountUpdate(accountData);
    });
  }

  if (handlers.onPositionUpdate) {
    hubConnection.on('PositionUpdate', (positionData) => {
      console.log('[SignalR] Position update received:', positionData);
      handlers.onPositionUpdate(positionData);
    });
  }

  if (handlers.onOrderUpdate) {
    hubConnection.on('OrderUpdate', (orderData) => {
      console.log('[SignalR] Order update received:', orderData);
      handlers.onOrderUpdate(orderData);
    });
  }

  console.log('[SignalR] Event handlers registered');
}

/**
 * Gets the current User Hub connection
 * @returns {object|null} SignalR HubConnection or null
 */
function getUserHubConnection() {
  return userHubConnection;
}

/**
 * Checks if User Hub is connected
 * @returns {boolean} Connection status
 */
function isConnected() {
  return userHubConnection && userHubConnection.state === signalR.HubConnectionState.Connected;
}

module.exports = {
  buildUserHubConnection,
  startConnection,
  stopConnection,
  registerEventHandlers,
  getUserHubConnection,
  isConnected
};
