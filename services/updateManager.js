// Auto-update manager for electron-updater
// Handles checking for updates, downloading, and installing

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('electron-log');

// Configure logger
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure for public GitHub repo
// No authentication needed for public repositories
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'shah0516',
  repo: 'cortexalgo-desktop',
  private: false // Repository will be public after security hardening
});

// Option 1: Ask before download (recommended for beta)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

class UpdateManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.updatePromptShown = false; // Track if we've shown the prompt for current version
    this.lastCheckedVersion = null; // Track which version we last prompted for
    this.setupListeners();
  }

  setupListeners() {
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version);

      // Send to renderer (for optional UI banner)
      this.mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes
      });

      // Only show dialog once per version per session
      if (this.updatePromptShown && this.lastCheckedVersion === info.version) {
        log.info('Update dialog already shown for version', info.version, '- skipping');
        return;
      }

      this.updatePromptShown = true;
      this.lastCheckedVersion = info.version;

      // Show dialog to user
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.\n\nWould you like to download it now?`,
        detail: 'You can continue using the app while it downloads.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          log.info('User chose to download update');
          autoUpdater.downloadUpdate();
          this.mainWindow.webContents.send('update-downloading');
        } else {
          log.info('User postponed update');
        }
      });
    });

    // Update not available
    autoUpdater.on('update-not-available', () => {
      log.info('Update not available - already on latest version');
    });

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent);
      log.info(`Download progress: ${percent}%`);
      this.mainWindow.webContents.send('update-progress', percent);
    });

    // Update downloaded and ready to install
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info.version);

      // Send to renderer
      this.mainWindow.webContents.send('update-ready');

      // Prompt user to restart
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Update to version ${info.version} downloaded successfully.\n\nRestart now to install?`,
        detail: 'The update will install automatically when you restart.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          log.info('User chose to restart and install update');
          autoUpdater.quitAndInstall();
        } else {
          log.info('User postponed restart - update will install on next launch');
        }
      });
    });

    // Error occurred
    autoUpdater.on('error', (error) => {
      log.error('Update error:', error);

      // Send to renderer
      this.mainWindow.webContents.send('update-error', error.message);

      // Only show error dialog if critical (not for "update not found")
      if (!error.message.includes('404')) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'error',
          title: 'Update Error',
          message: 'Failed to check for updates',
          detail: error.message,
          buttons: ['OK']
        });
      }
    });
  }

  // Manually check for updates (can be called from menu or UI)
  checkForUpdates() {
    log.info('Manually checking for updates...');
    autoUpdater.checkForUpdates();
  }

  // Start automatic update checks
  startAutoCheck() {
    // Check on startup (after 10 seconds to avoid slowing app launch)
    setTimeout(() => {
      log.info('Initial update check on startup');
      autoUpdater.checkForUpdates();
    }, 10000);

    // Check every 10 minutes
    setInterval(() => {
      log.info('Periodic update check');
      autoUpdater.checkForUpdates();
    }, 10 * 60 * 1000); // 10 minutes
  }
}

module.exports = UpdateManager;
