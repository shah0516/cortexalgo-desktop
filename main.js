// main.js - The heart of the Electron App (Main Process)

const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindow = null;
let currentPnl = 0;

// Application State Management
const APP_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  DEACTIVATED: 'deactivated',
  WARNING: 'warning'
};

let currentState = APP_STATES.CONNECTING;

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
      enabled: false  // Placeholder for future implementation
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
app.whenReady().then(() => {
  createTray();
  createMainWindow();
  startMockCloudFeed(); // Start our simulator

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
