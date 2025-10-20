// main.js - The heart of the Electron App (Main Process)

const { app, BrowserWindow, Tray, Menu, ipcMain, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const topstepClient = require('./services/topstepClient');
const cloudApiService = require('./services/cloudApiService');
const UpdateManager = require('./services/updateManager');
const securityService = require('./services/securityService');
const keytar = require('keytar');

let tray = null;
let mainWindow = null;
let activationWindow = null;
let apiKeyWindow = null;
let updateManager = null;
let currentPnl = 0;
let topstepAccounts = [];
let isTopstepInitialized = false;
let cloudConnectionState = 'disconnected'; // Track cloud connection separately

// Credentials configuration
const SERVICE_NAME = 'CortexAlgo';
const CLOUD_REFRESH_TOKEN_ACCOUNT = 'cloud_refresh_token';
const CLOUD_ACCESS_TOKEN_ACCOUNT = 'cloud_access_token';
const CLOUD_BOT_ID_ACCOUNT = 'cloud_bot_id';
const CLOUD_DEVICE_FINGERPRINT_ACCOUNT = 'cloud_device_fingerprint';
const CREDENTIALS_FILE = path.join(app.getPath('userData'), 'topstepx_credentials.enc');

// Application State Management
const APP_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  DEACTIVATED: 'deactivated',
  WARNING: 'warning'
};

let currentState = APP_STATES.CONNECTING;

// ========== Secure Credential Storage ==========

// ===== Cloud API Tokens =====

// Store cloud tokens in OS keychain
async function storeCloudTokens(botId, accessToken, refreshToken, deviceFingerprint) {
  try {
    await keytar.setPassword(SERVICE_NAME, CLOUD_BOT_ID_ACCOUNT, botId);
    await keytar.setPassword(SERVICE_NAME, CLOUD_ACCESS_TOKEN_ACCOUNT, accessToken);
    await keytar.setPassword(SERVICE_NAME, CLOUD_REFRESH_TOKEN_ACCOUNT, refreshToken);
    await keytar.setPassword(SERVICE_NAME, CLOUD_DEVICE_FINGERPRINT_ACCOUNT, deviceFingerprint);
    return true;
  } catch (error) {
    console.error('Failed to store cloud tokens:', error);
    return false;
  }
}

// Retrieve cloud tokens from OS keychain
async function getCloudTokens() {
  try {
    const botId = await keytar.getPassword(SERVICE_NAME, CLOUD_BOT_ID_ACCOUNT);
    const accessToken = await keytar.getPassword(SERVICE_NAME, CLOUD_ACCESS_TOKEN_ACCOUNT);
    const refreshToken = await keytar.getPassword(SERVICE_NAME, CLOUD_REFRESH_TOKEN_ACCOUNT);
    const deviceFingerprint = await keytar.getPassword(SERVICE_NAME, CLOUD_DEVICE_FINGERPRINT_ACCOUNT);

    if (botId && accessToken && refreshToken && deviceFingerprint) {
      return { botId, accessToken, refreshToken, deviceFingerprint };
    }
    return null;
  } catch (error) {
    console.error('Failed to get cloud tokens:', error);
    return null;
  }
}

// Delete cloud tokens from OS keychain
async function deleteCloudTokens() {
  try {
    await keytar.deletePassword(SERVICE_NAME, CLOUD_BOT_ID_ACCOUNT);
    await keytar.deletePassword(SERVICE_NAME, CLOUD_ACCESS_TOKEN_ACCOUNT);
    await keytar.deletePassword(SERVICE_NAME, CLOUD_REFRESH_TOKEN_ACCOUNT);
    await keytar.deletePassword(SERVICE_NAME, CLOUD_DEVICE_FINGERPRINT_ACCOUNT);
    return true;
  } catch (error) {
    console.error('Failed to delete cloud tokens:', error);
    return false;
  }
}

// Store TopstepX credentials using electron.safeStorage (encrypted)
function storeTopstepXCredentials(username, apiKey) {
  try {
    const credentials = JSON.stringify({ username, apiKey });
    const encrypted = safeStorage.encryptString(credentials);
    fs.writeFileSync(CREDENTIALS_FILE, encrypted);
    return true;
  } catch (error) {
    console.error('Failed to store TopstepX credentials:', error);
    return false;
  }
}

// Retrieve TopstepX credentials using electron.safeStorage (decrypted)
function getTopstepXCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      return null;
    }
    const encrypted = fs.readFileSync(CREDENTIALS_FILE);
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to get TopstepX credentials:', error);
    return null;
  }
}

// Delete stored TopstepX credentials
function deleteTopstepXCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete TopstepX credentials:', error);
    return false;
  }
}

// Check if user has completed activation
async function isActivated() {
  const cloudTokens = await getCloudTokens();
  const credentials = getTopstepXCredentials();
  return cloudTokens !== null && credentials !== null && credentials.username && credentials.apiKey;
}

// ========== Window Creation Functions ==========

// This function creates the main dashboard window.
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'CortexAlgo Dashboard',
    webPreferences: {
      // The preload script is the secure bridge between this Node.js process
      // and the React UI running in the browser window.
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // For development, we'll load from a local file. In production, this would be a bundled asset.
  mainWindow.loadFile('public/index.html');

  // Optional: Open DevTools for development
  // mainWindow.webContents.openDevTools();

  // When the window is closed, we just hide it instead of quitting.
  mainWindow.on('close', (event) => {
    if (app.quitting) {
      mainWindow = null;
    } else {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// This function creates the activation window
function createActivationWindow() {
  activationWindow = new BrowserWindow({
    width: 540,
    height: 620,
    title: 'Activate CortexAlgo',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  activationWindow.loadFile('public/activation.html');

  // Prevent closing - user must complete activation
  activationWindow.on('close', (event) => {
    if (!app.quitting) {
      event.preventDefault();
    }
  });
}

// This function creates the API key window
function createApiKeyWindow() {
  apiKeyWindow = new BrowserWindow({
    width: 540,
    height: 680,
    title: 'Connect TopstepX Account',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  apiKeyWindow.loadFile('public/api-key.html');

  // Prevent closing - user must complete setup
  apiKeyWindow.on('close', (event) => {
    if (!app.quitting) {
      event.preventDefault();
    }
  });
}

// Get the appropriate tray icon based on current state
function getTrayIconPath(state) {
  const iconMap = {
    [APP_STATES.CONNECTING]: 'assets/tray-icon-blue.png',
    [APP_STATES.CONNECTED]: 'assets/tray-icon-green.png',
    [APP_STATES.DISCONNECTED]: 'assets/tray-icon-yellow.png',  // Yellow: temporary network issue, auto-recovering
    [APP_STATES.DEACTIVATED]: 'assets/tray-icon-red.png',      // Red: critical, requires user action
    [APP_STATES.WARNING]: 'assets/tray-icon-yellow.png'        // Yellow: action required (e.g., API key)
  };

  const iconPath = iconMap[state] || 'assets/tray-icon.png';

  // Fallback to default icon if state-specific icon doesn't exist
  if (!fs.existsSync(path.join(__dirname, iconPath))) {
    console.log(`Icon not found: ${iconPath}, using default`);
    return 'assets/tray-icon.png';
  }

  return iconPath;
}

// Update the tray icon based on current state
function updateTrayIcon() {
  if (!tray) return;

  // Determine effective state considering both TopstepX and Cloud
  let effectiveState = currentState;

  // If TopstepX is connected but Cloud is not, show warning
  if (currentState === APP_STATES.CONNECTED && cloudConnectionState !== 'connected') {
    effectiveState = APP_STATES.WARNING;
  }

  const iconPath = getTrayIconPath(effectiveState);
  tray.setImage(path.join(__dirname, iconPath));

  // Update tooltip based on state
  const tooltips = {
    [APP_STATES.CONNECTING]: 'CortexAlgo - Connecting...',
    [APP_STATES.CONNECTED]: cloudConnectionState === 'connected'
      ? 'CortexAlgo - Connected (TopstepX + Cloud)'
      : 'CortexAlgo - Connected (TopstepX only, Cloud disconnected)',
    [APP_STATES.DISCONNECTED]: 'CortexAlgo - Reconnecting...',
    [APP_STATES.DEACTIVATED]: 'CortexAlgo - Subscription Inactive',
    [APP_STATES.WARNING]: 'CortexAlgo - Cloud Disconnected'
  };

  tray.setToolTip(tooltips[effectiveState] || 'CortexAlgo');
}

// Update application state and refresh UI
function setState(newState) {
  if (currentState === newState) return;

  console.log(`State transition: ${currentState} → ${newState}`);
  currentState = newState;

  updateTrayIcon();
  updateTrayMenu();

  // Notify renderer process of state change
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-state-changed', {
      state: currentState,
      pnl: currentPnl
    });
  }
}

// This function builds the tray menu based on current state
function buildTrayMenu() {
  const menuTemplate = [];

  // Status label (varies by state)
  const statusLabels = {
    [APP_STATES.CONNECTING]: 'Status: Connecting...',
    [APP_STATES.CONNECTED]: cloudConnectionState === 'connected'
      ? 'Status: Connected (TopstepX + Cloud)'
      : 'Status: TopstepX Connected, Cloud Disconnected',
    [APP_STATES.DISCONNECTED]: 'Status: Reconnecting...',
    [APP_STATES.DEACTIVATED]: 'Status: Subscription Inactive',
    [APP_STATES.WARNING]: 'Status: Cloud Disconnected'
  };

  menuTemplate.push({
    label: statusLabels[currentState] || 'Status: Unknown',
    enabled: false
  });

  // Show PNL only when connected
  if (currentState === APP_STATES.CONNECTED) {
    menuTemplate.push({
      label: `Daily PNL: ${currentPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
      enabled: false
    });
  }

  menuTemplate.push({ type: 'separator' });

  // Primary action based on state
  if (currentState === APP_STATES.CONNECTED || currentState === APP_STATES.WARNING) {
    menuTemplate.push({
      label: 'Show Performance Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    });
  }

  if (currentState === APP_STATES.DEACTIVATED) {
    menuTemplate.push({
      label: 'Visit Billing Portal...',
      click: () => {
        require('electron').shell.openExternal('https://cortexalgo.com/billing');
      }
    });
  }

  // Additional options
  if (currentState === APP_STATES.CONNECTED || currentState === APP_STATES.WARNING) {
    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({
      label: 'View Logs...',
      enabled: false  // Placeholder for future implementation
    });
    menuTemplate.push({
      label: 'Change TopstepX API Key...',
      click: () => {
        createApiKeyWindow();
      }
    });
  }

  // Quit option (always available)
  menuTemplate.push({ type: 'separator' });
  menuTemplate.push({
    label: 'Quit',
    click: () => {
      app.quitting = true;
      app.quit();
    }
  });

  return menuTemplate;
}

// Update the tray menu
function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate(buildTrayMenu());
  tray.setContextMenu(contextMenu);
}

// This function creates the System Tray icon and its menu.
function createTray() {
  const iconPath = getTrayIconPath(currentState);
  tray = new Tray(path.join(__dirname, iconPath));

  updateTrayIcon();
  updateTrayMenu();

  // Double-click tray icon to show dashboard
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
}

// --- CLOUD API INTEGRATION ---
// Initialize and connect to Cloud API
async function initializeCloudApi() {
  console.log('[Main] Initializing Cloud API...');

  try {
    // Initialize cloud service with event handlers
    cloudApiService.initialize({
      onCommand: (commandData) => {
        console.log('[Main] Cloud command received:', commandData);
        handleCloudCommand(commandData);
      },
      onTradeDirective: (directiveData) => {
        console.log('[Main] Trade directive received:', directiveData);
        handleTradeDirective(directiveData);
      },
      onConnectionStateChanged: (state) => {
        console.log('[Main] Cloud connection state:', state);

        // Update cloud connection state
        cloudConnectionState = state;

        // Update tray icon and menu to reflect cloud status
        updateTrayIcon();
        updateTrayMenu();

        // Notify UI of cloud connection status
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('cloud-connection-changed', {
            status: state,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Get stored tokens
    const tokens = await getCloudTokens();
    if (!tokens) {
      console.error('[Main] No cloud tokens found');
      return false;
    }

    // Refresh tokens before connecting (in case they expired)
    console.log('[Main] Refreshing access token...');
    const refreshResult = await cloudApiService.refreshAccessToken(tokens.refreshToken);

    if (!refreshResult.success) {
      console.error('[Main] Token refresh failed. User may need to reactivate.');
      return false;
    }

    // Store refreshed tokens (preserve device fingerprint)
    await storeCloudTokens(tokens.botId, refreshResult.accessToken, refreshResult.refreshToken, tokens.deviceFingerprint);

    // Set tokens in cloud service
    cloudApiService.setTokens({
      botId: tokens.botId,
      accessToken: refreshResult.accessToken,
      refreshToken: refreshResult.refreshToken,
      deviceFingerprint: tokens.deviceFingerprint
    });

    // Connect to WebSocket with fresh token
    await cloudApiService.connectWebSocket(refreshResult.accessToken);
    console.log('[Main] Cloud WebSocket connected');

    // Start telemetry reporting
    cloudApiService.startTelemetryReporting(() => {
      return topstepClient.getAccounts();
    });

    // Start token refresh
    cloudApiService.startTokenRefresh(async (newTokens) => {
      console.log('[Main] Cloud tokens refreshed');
      // Get current device fingerprint (should be same as stored)
      const currentTokens = await getCloudTokens();
      await storeCloudTokens(cloudApiService.getBotId(), newTokens.accessToken, newTokens.refreshToken, currentTokens.deviceFingerprint);
    });

    console.log('[Main] Cloud API initialization complete');
    return true;

  } catch (error) {
    console.error('[Main] Cloud API initialization failed:', error);
    return false;
  }
}

// Handle commands from cloud
function handleCloudCommand(commandData) {
  const { command, payload } = commandData;

  switch (command) {
    case 'SET_TRADING_STATUS':
      console.log('[Main] Applying kill switch from cloud:', payload.enabled);

      // Apply kill switch to TopstepX
      if (isTopstepInitialized) {
        topstepClient.setMasterKillSwitch(payload.enabled);

        // Update UI
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('trading-status-changed', {
            source: 'cloud',
            enabled: payload.enabled
          });
        }

        console.log(`[Main] Kill switch ${payload.enabled ? 'DISABLED' : 'ACTIVATED'} by cloud`);
      }
      break;

    default:
      console.warn('[Main] Unknown command from cloud:', command);
  }
}

/**
 * Handle trade directive from cloud engine
 * @param {Object} directiveData - Trade directive data (flat structure from admin-API relay)
 */
async function handleTradeDirective(directiveData) {
  const { directiveId, virtualBotId, strategyConfigId, physicalBotId, accountId: accountIdRaw, symbol, action, price, contracts, reason, timestamp } = directiveData;

  // Parse accountId as integer (TopstepX uses numeric account IDs)
  const accountId = parseInt(accountIdRaw, 10);

  console.log('[Main] 🎯 Processing trade directive:', {
    directiveId,
    accountId,
    action,
    symbol,
    price,
    contracts
  });

  // Check if TopstepX is initialized
  if (!isTopstepInitialized) {
    console.error('[Main] Cannot execute trade - TopstepX not initialized');
    return;
  }

  // Check kill switches
  const canTrade = topstepClient.canTrade(accountId);
  if (!canTrade) {
    console.warn('[Main] ❌ Trading disabled for account', accountId);

    // Notify UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('signal-rejected', {
        directiveId,
        accountId,
        action,
        symbol,
        price,
        contracts,
        reason: 'Kill switch enabled',
        timestamp
      });
    }
    return;
  }

  // Send signal to UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('signal-received', {
      directiveId,
      accountId,
      action,
      symbol,
      price,
      contracts,
      reason,
      timestamp
    });
  }

  // Execute order
  try {
    const orderExecutionService = require('./services/orderExecutionService');

    const result = await orderExecutionService.submitOrder({
      accountId: accountId,
      action: action,
      symbol: symbol,
      lots: contracts
    });

    if (result.success) {
      console.log('[Main] ✅ Order submitted successfully:', result.orderId);

      // Notify UI
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('order-submitted', {
          directiveId,
          accountId,
          action,
          symbol,
          price,
          contracts,
          order: result,
          timestamp
        });
      }
    } else {
      console.error('[Main] ❌ Order submission failed:', result.error);

      // Notify UI
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('order-failed', {
          directiveId,
          accountId,
          action,
          symbol,
          price,
          contracts,
          error: result.error,
          timestamp
        });
      }
    }
  } catch (error) {
    console.error('[Main] Exception during order execution:', error);

    // Notify UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('order-failed', {
        directiveId,
        accountId,
        action,
        symbol,
        price,
        contracts,
        error: error.message,
        timestamp
      });
    }
  }
}

// --- TOPSTEPX INTEGRATION ---
// Initialize and connect to TopstepX
async function initializeTopstepX() {
  console.log('[Main] Initializing TopstepX...');

  try {
    // Get stored credentials
    const credentials = getTopstepXCredentials();

    if (!credentials) {
      console.error('[Main] No TopstepX credentials found');
      setState(APP_STATES.WARNING);
      return false;
    }

    setState(APP_STATES.CONNECTING);

    // Initialize TopstepX client with callbacks
    await topstepClient.initialize(credentials, {
      onAccountsLoaded: (accounts) => {
        console.log(`[Main] TopstepX accounts loaded: ${accounts.length}`);
        topstepAccounts = accounts;
        isTopstepInitialized = true;

        // Send accounts to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('accounts-loaded', accounts);
        }

        setState(APP_STATES.CONNECTED);
      },

      onFill: (fillData) => {
        console.log('[Main] Fill received:', fillData);

        // Send fill to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('fill-update', fillData);
        }
      },

      onAccountUpdate: (accountData) => {
        console.log('[Main] Account update:', accountData);

        // Update cumulative PNL
        currentPnl = topstepClient.getCumulativePnl();

        // Send PNL update to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pnl-update', {
            timestamp: new Date().toISOString(),
            pnl: currentPnl,
            accountId: accountData.accountId
          });
        }

        // Update tray menu
        updateTrayMenu();
      },

      onConnectionStateChanged: (state) => {
        console.log('[Main] TopstepX connection state:', state);

        // Map to app states
        if (state === 'connected') {
          setState(APP_STATES.CONNECTED);
        } else if (state === 'disconnected') {
          setState(APP_STATES.DISCONNECTED);
        } else if (state === 'error') {
          setState(APP_STATES.WARNING);
        }
      }
    });

    console.log('[Main] TopstepX initialization complete');
    return true;

  } catch (error) {
    console.error('[Main] TopstepX initialization failed:', error);
    setState(APP_STATES.WARNING);
    return false;
  }
}

// --- MOCK CONNECTION MANAGER (The "Flight Simulator") ---
// This simulates our cloud engine sending real-time data to the agent.
function startMockCloudFeed() {
  let tradeCounter = 0;

  // Simulate initial connection
  setTimeout(() => {
    console.log('Mock: Connection established');
    setState(APP_STATES.CONNECTED);
  }, 2000); // Connect after 2 seconds

  // Main update loop
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    // Only send PNL updates when connected
    if (currentState === APP_STATES.CONNECTED) {
      // Simulate a PNL update
      const change = (Math.random() - 0.45) * 10;
      currentPnl += change;

      const pnlUpdate = {
        timestamp: new Date().toISOString(),
        pnl: currentPnl,
        change: change
      };

      // Send the PNL update to the UI window via the IPC bridge
      mainWindow.webContents.send('pnl-update', pnlUpdate);

      // Update the tray menu to reflect new PNL
      updateTrayMenu();

      console.log('PNL Update:', pnlUpdate);

      // Every 3 intervals (6 seconds), simulate a trade directive
      if (tradeCounter % 3 === 0) {
        const actions = ['ENTRY_LONG', 'ENTRY_SHORT', 'EXIT_LONG', 'EXIT_SHORT'];
        const instruments = ['NQ', 'ES', 'YM', 'RTY'];

        const mockDirective = {
          directiveId: `mock-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: actions[Math.floor(Math.random() * actions.length)],
          instrument: instruments[Math.floor(Math.random() * instruments.length)],
          lots: Math.floor(Math.random() * 5) + 1,
          orderType: 'MARKET',
          price: (Math.random() * 5000 + 15000).toFixed(2),
          reason: 'Simulated Signal'
        };

        // Send the trade directive to the UI window
        mainWindow.webContents.send('trade-directive', mockDirective);
        console.log('Trade Directive:', mockDirective);
      }
    }

    tradeCounter++;

  }, 2000); // Send an update every 2 seconds

  // Optional: Simulate state changes for testing (uncomment to test all states)
  // This cycles through different states every 20 seconds for demonstration
  /*
  let stateIndex = 0;
  const testStates = [
    APP_STATES.CONNECTED,
    APP_STATES.WARNING,
    APP_STATES.DISCONNECTED,
    APP_STATES.CONNECTING,
    APP_STATES.DEACTIVATED
  ];

  setInterval(() => {
    stateIndex = (stateIndex + 1) % testStates.length;
    console.log(`Mock: Cycling to state: ${testStates[stateIndex]}`);
    setState(testStates[stateIndex]);
  }, 20000); // Change state every 20 seconds
  */
}


// --- Electron App Lifecycle ---
app.whenReady().then(async () => {
  createTray();

  // Check if user has completed activation
  const activated = await isActivated();

  if (!activated) {
    // First run - show activation window
    createActivationWindow();
  } else {
    // User is activated - show main window and initialize services
    createMainWindow();

    // Initialize TopstepX
    await initializeTopstepX();

    // Initialize Cloud API (WebSocket + telemetry)
    await initializeCloudApi();

    // Initialize auto-updater (production only)
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) {
      updateManager = new UpdateManager(mainWindow);
      updateManager.startAutoCheck();
      console.log('[Main] Auto-updater initialized');
    }
  }

  // This is for macOS behavior
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, closing all windows usually quits the app.
    // We are overriding this to keep the tray icon alive.
  }
});

app.on('before-quit', () => {
  app.quitting = true;
});

// IPC handlers
ipcMain.handle('get-current-pnl', async () => {
  return currentPnl;
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('get-app-state', async () => {
  return {
    state: currentState,
    pnl: currentPnl
  };
});

// Handle activation token submission
ipcMain.handle('activate-with-token', async (event, token) => {
  try {
    // Validate token format
    if (!token || !token.startsWith('act_')) {
      return { success: false, error: 'Invalid activation token format' };
    }

    console.log('[Main] Activating bot with cloud API...');

    // Generate device fingerprint for this machine
    const deviceFingerprint = securityService.getDeviceFingerprint();
    console.log('[Main] Device fingerprint generated:', deviceFingerprint.substring(0, 16) + '...');

    // Call cloud API to activate bot with device fingerprint
    const result = await cloudApiService.activateBot(token, deviceFingerprint);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Store cloud tokens and device fingerprint in OS keychain
    const stored = await storeCloudTokens(result.botId, result.accessToken, result.refreshToken, deviceFingerprint);

    if (!stored) {
      return { success: false, error: 'Failed to store credentials securely' };
    }

    console.log('[Main] Bot activation successful. Bot ID:', result.botId);

    // Close activation window and show API key window
    if (activationWindow) {
      activationWindow.destroy();
      activationWindow = null;
    }

    createApiKeyWindow();

    return { success: true };
  } catch (error) {
    console.error('[Main] Activation error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
});

// Handle API key submission
ipcMain.handle('save-api-key', async (event, credentials) => {
  try {
    // Validate credentials object
    if (!credentials || typeof credentials !== 'object') {
      return { success: false, error: 'Invalid credentials format' };
    }

    const { username, apiKey } = credentials;

    if (!username || username.length < 3) {
      return { success: false, error: 'Username appears to be invalid' };
    }

    if (!apiKey || apiKey.length < 10) {
      return { success: false, error: 'API key appears to be invalid' };
    }

    // Store credentials using electron.safeStorage
    const stored = storeTopstepXCredentials(username, apiKey);

    if (!stored) {
      return { success: false, error: 'Failed to store credentials securely' };
    }

    console.log(`TopstepX credentials stored successfully for user: ${username.substring(0, 3)}***`);

    // Close API key window
    if (apiKeyWindow) {
      apiKeyWindow.destroy();
      apiKeyWindow = null;
    }

    // Only create main window if it doesn't exist (first-time setup)
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
      await initializeTopstepX();

      // Initialize Cloud API (WebSocket + telemetry)
      await initializeCloudApi();

      // Initialize auto-updater (production only)
      const isDev = process.env.NODE_ENV === 'development';
      if (!isDev) {
        updateManager = new UpdateManager(mainWindow);
        updateManager.startAutoCheck();
        console.log('[Main] Auto-updater initialized');
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Credentials save error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
});

// Handle external link opening
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

// --- TopstepX IPC Handlers ---

// Get all TopstepX accounts
ipcMain.handle('get-topstep-accounts', async () => {
  if (!isTopstepInitialized) {
    return [];
  }
  return topstepClient.getAccounts();
});

// Get cumulative PNL
ipcMain.handle('get-cumulative-pnl', async () => {
  if (!isTopstepInitialized) {
    return 0;
  }
  return topstepClient.getCumulativePnl();
});

// Set master kill switch
ipcMain.handle('set-master-kill-switch', async (event, enabled) => {
  if (!isTopstepInitialized) {
    return { success: false, error: 'TopstepX not initialized' };
  }

  topstepClient.setMasterKillSwitch(enabled);
  console.log(`[Main] Master kill switch set to: ${enabled}`);

  return { success: true, enabled };
});

// Get master kill switch status
ipcMain.handle('get-master-kill-switch', async () => {
  if (!isTopstepInitialized) {
    return false;
  }
  return topstepClient.getMasterKillSwitch();
});

// Set account trading status
ipcMain.handle('set-account-trading', async (event, accountId, enabled) => {
  if (!isTopstepInitialized) {
    return { success: false, error: 'TopstepX not initialized' };
  }

  const success = topstepClient.setAccountTrading(accountId, enabled);

  if (success) {
    console.log(`[Main] Account ${accountId} trading set to: ${enabled}`);
    return { success: true, accountId, enabled };
  } else {
    return { success: false, error: 'Account not found' };
  }
});

// Get trading status for all accounts
ipcMain.handle('get-trading-status', async () => {
  if (!isTopstepInitialized) {
    return { masterEnabled: false, accounts: {} };
  }
  return topstepClient.getTradingStatus();
});

// --- Auto-Update IPC Handlers ---

// Manual update check
ipcMain.handle('check-for-updates', async () => {
  if (updateManager) {
    updateManager.checkForUpdates();
    return { success: true };
  }
  return { success: false, error: 'Auto-updater not initialized' };
});
