// main.js - The heart of the Electron App (Main Process)

const { app, BrowserWindow, Tray, Menu, ipcMain, safeStorage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const keytar = require('keytar');

let tray = null;
let mainWindow = null;
let activationWindow = null;
let apiKeyWindow = null;
let currentPnl = 0;

// Credentials configuration
const SERVICE_NAME = 'CortexAlgo';
const REFRESH_TOKEN_ACCOUNT = 'refresh_token';
const API_KEY_FILE = path.join(app.getPath('userData'), 'api_key.enc');

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

// Store refresh token in OS keychain
async function storeRefreshToken(token) {
  try {
    await keytar.setPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT, token);
    return true;
  } catch (error) {
    console.error('Failed to store refresh token:', error);
    return false;
  }
}

// Retrieve refresh token from OS keychain
async function getRefreshToken() {
  try {
    return await keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

// Delete refresh token from OS keychain
async function deleteRefreshToken() {
  try {
    return await keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_ACCOUNT);
  } catch (error) {
    console.error('Failed to delete refresh token:', error);
    return false;
  }
}

// Store API key using electron.safeStorage (encrypted)
function storeApiKey(apiKey) {
  try {
    const encrypted = safeStorage.encryptString(apiKey);
    fs.writeFileSync(API_KEY_FILE, encrypted);
    return true;
  } catch (error) {
    console.error('Failed to store API key:', error);
    return false;
  }
}

// Retrieve API key using electron.safeStorage (decrypted)
function getApiKey() {
  try {
    if (!fs.existsSync(API_KEY_FILE)) {
      return null;
    }
    const encrypted = fs.readFileSync(API_KEY_FILE);
    return safeStorage.decryptString(encrypted);
  } catch (error) {
    console.error('Failed to get API key:', error);
    return null;
  }
}

// Delete stored API key
function deleteApiKey() {
  try {
    if (fs.existsSync(API_KEY_FILE)) {
      fs.unlinkSync(API_KEY_FILE);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return false;
  }
}

// Check if user has completed activation
async function isActivated() {
  const refreshToken = await getRefreshToken();
  const apiKey = getApiKey();
  return refreshToken !== null && apiKey !== null;
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

  const iconPath = getTrayIconPath(currentState);
  tray.setImage(path.join(__dirname, iconPath));

  // Update tooltip based on state
  const tooltips = {
    [APP_STATES.CONNECTING]: 'CortexAlgo - Connecting...',
    [APP_STATES.CONNECTED]: 'CortexAlgo - Connected',
    [APP_STATES.DISCONNECTED]: 'CortexAlgo - Reconnecting...',
    [APP_STATES.DEACTIVATED]: 'CortexAlgo - Subscription Inactive',
    [APP_STATES.WARNING]: 'CortexAlgo - Action Required'
  };

  tray.setToolTip(tooltips[currentState] || 'CortexAlgo');
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
    [APP_STATES.CONNECTED]: 'Status: Connected (Mock)',
    [APP_STATES.DISCONNECTED]: 'Status: Reconnecting...',
    [APP_STATES.DEACTIVATED]: 'Status: Subscription Inactive',
    [APP_STATES.WARNING]: 'Status: Action Required'
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
    // User is activated - show main window and start
    createMainWindow();
    startMockCloudFeed();
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
    // Mock validation: Accept any token starting with 'act_'
    if (!token.startsWith('act_')) {
      return { success: false, error: 'Invalid activation token format' };
    }

    // In production, this would make an API call to validate the token
    // For now, simulate a successful activation
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

    // Generate a mock refresh token
    const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store refresh token in OS keychain
    const stored = await storeRefreshToken(refreshToken);

    if (!stored) {
      return { success: false, error: 'Failed to store credentials securely' };
    }

    // Close activation window and show API key window
    if (activationWindow) {
      activationWindow.destroy();
      activationWindow = null;
    }

    createApiKeyWindow();

    return { success: true };
  } catch (error) {
    console.error('Activation error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
});

// Handle API key submission
ipcMain.handle('save-api-key', async (event, apiKey) => {
  try {
    if (!apiKey || apiKey.length < 10) {
      return { success: false, error: 'API key appears to be invalid' };
    }

    // Store API key using electron.safeStorage
    const stored = storeApiKey(apiKey);

    if (!stored) {
      return { success: false, error: 'Failed to store API key securely' };
    }

    // Close API key window
    if (apiKeyWindow) {
      apiKeyWindow.destroy();
      apiKeyWindow = null;
    }

    // Only create main window if it doesn't exist (first-time setup)
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
      startMockCloudFeed();
    }

    return { success: true };
  } catch (error) {
    console.error('API key save error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
});

// Handle external link opening
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});
