// preload.js - The Secure IPC Bridge
// This script runs in a special context that has access to both Node.js APIs
// and the browser window, but is isolated for security.

const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the renderer process (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for PNL updates from the main process
  onPnlUpdate: (callback) => {
    ipcRenderer.on('pnl-update', (event, data) => {
      callback(data);
    });
  },

  // Listen for trade directives from the main process
  onTradeDirective: (callback) => {
    ipcRenderer.on('trade-directive', (event, data) => {
      callback(data);
    });
  },

  // Listen for application state changes
  onAppStateChanged: (callback) => {
    ipcRenderer.on('app-state-changed', (event, data) => {
      callback(data);
    });
  },

  // Request current application state
  getAppState: () => ipcRenderer.invoke('get-app-state'),
  getCurrentPnl: () => ipcRenderer.invoke('get-current-pnl'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
