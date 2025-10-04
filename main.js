// main.js - The heart of the Electron App (Main Process)

const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let currentPnl = 0;

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

// This function updates the tray menu with current PNL
function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Status: Connected (Mock)', enabled: false },
    { label: `Daily PNL: ${currentPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` },
    { type: 'separator' },
    {
      label: 'Show Performance Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => {
        app.quitting = true;
        app.quit();
      }
    },
  ]);
  tray.setContextMenu(contextMenu);
}

// This function creates the System Tray icon and its menu.
function createTray() {
  tray = new Tray('assets/tray-icon.png'); // 32x32 icon optimized for system tray
  tray.setToolTip('CortexAlgo - Connected');
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

  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

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

    // Update the tray menu
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

    tradeCounter++;

  }, 2000); // Send an update every 2 seconds
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

// IPC handlers for future use
ipcMain.handle('get-current-pnl', async () => {
  return currentPnl;
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});
