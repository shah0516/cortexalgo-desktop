# CortexAlgo Desktop

Desktop application for the CortexAlgo cloud-hybrid automated trading platform. Acts as the secure execution agent - the local component that receives trade directives from the cloud engine and executes them via broker APIs.

## Features

- **Cloud Integration**: Real-time WebSocket connection to CortexAlgo Cloud API
- **TopstepX Integration**: Multi-account management with real-time PNL and position tracking
- **Account Detail View**: Individual account tabs with comprehensive performance metrics
- **Bot Management**: Master kill switch + individual account bot controls with status tracking
- **Real-time Updates**: Live P&L tracking, position tables, and trade fill notifications
- **Mock Development Mode**: Complete testing environment with realistic mock trading data
- **Secure Authentication**: Two-step activation flow with OS keychain storage
- **Device Fingerprinting**: Machine-bound sessions with HMAC-SHA256 request signing
- **Auto-Updates**: Automatic updates via GitHub Releases with electron-updater
- **Background Operation**: Runs silently in system tray with state-based indicators
- **Real-time Dashboard**: Native UI showing accounts, PNL, positions, and directives
- **Telemetry Reporting**: 30-second heartbeat with account data to cloud

## Prerequisites

- Node.js 18+
- macOS, Windows, or Linux

## Installation

### For End Users

Download the latest release for your platform:
- **macOS Intel**: `CortexAlgo-{version}.dmg`
- **macOS Apple Silicon**: `CortexAlgo-{version}-arm64.dmg`
- **Windows**: `CortexAlgo Setup {version}.exe`

### For Developers

```bash
npm install
```

## Development

### Development vs Production Mode

The application automatically detects and switches between development and production modes:

#### **Development Mode** 
Used for coding, testing, and debugging without real trading data.

**How to run in development mode:**
```bash
# Method 1: Environment variable (recommended)
NODE_ENV=development npm start

# Method 2: Command flag
npm start -- --dev

# Method 3: Auto-detection (running from source)
npm start
```

**What happens in development mode:**
- ✅ **Skips activation** - No API keys or cloud tokens required
- ✅ **Uses mock data** - Loads 5 fake trading accounts with realistic data
- ✅ **Simulates real-time updates** - Mock P&L changes and trade fills
- ✅ **Safe testing environment** - No real trading or API calls
- 🔧 **Hot reload available** - Use `npm run dev` for automatic restarts

**Mock accounts included:**
- Express Eval - NQ (Nasdaq futures)
- Express Eval - ES (S&P 500 futures) 
- Funded Trader - MNQ (Micro Nasdaq)
- Practice Account - YM (Dow Jones)
- Scaling Plan - RTY (Russell 2000)

#### **Production Mode**
Used with real TopstepX credentials and live trading data.

**Requirements:**
- Valid TopstepX API credentials
- CortexAlgo cloud activation tokens
- Built/packaged application (not running from source)

**Console indicators:**
- Development: `🚧 Using DEVELOPMENT MODE with mock accounts`
- Production: `Connecting to real TopstepX API...`

### Hot Reload Development

For rapid development with automatic app restarts:

```bash
npm run dev
```

This uses nodemon to watch for file changes and automatically restart the Electron app.

## Building for Production

Build platform-specific installers:

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux

# All platforms
npm run build
```

Built applications will be in the `dist/` folder.

## Architecture

### Main Process (main.js)
- Backend Node.js engine running in the background
- Orchestrates TopstepX services (authentication, SignalR, accounts)
- Manages cloud API connection (WebSocket, telemetry, commands)
- System tray and window management
- IPC communication with renderer

### Services Layer (services/)
- `topstepClient.js` - TopstepX orchestrator
- `authService.js` - Token management with auto-refresh (23.5hr lifetime)
- `signalRService.js` - User Hub WebSocket for real-time fills/PNL
- `accountManager.js` - Multi-account state and kill switch logic
- `cloudApiService.js` - Cloud API integration (activation, telemetry, WebSocket)
- `updateManager.js` - Auto-update logic with GitHub Releases
- `securityService.js` - Device fingerprinting and request signing

### Renderer Process (src/App.js)
- React-based dashboard UI (loaded via CDN, no bundler)
- Displays accounts, PNL, positions, trade directives
- Receives data from Main Process via secure IPC bridge
- Never sees credentials or tokens (security isolation)

### Preload Script (preload.js)
- Secure IPC bridge using contextBridge
- Exposes `window.electronAPI` to React
- Principle of least privilege (only whitelisted APIs)

## Security

### Authentication
- Two-step activation: cloud token + TopstepX credentials
- Cloud tokens stored in OS keychain (via `keytar`)
- TopstepX credentials encrypted via `electron.safeStorage`
- Device fingerprint binding (SHA256 of machine ID)
- HMAC-SHA256 request signing with nonce-based replay prevention

### Network
- All API calls use HTTPS/WSS
- Device fingerprint sent with every request
- Request signatures validated server-side
- JWT tokens with 15-minute expiration

### Credential Storage
- **Cloud tokens**: OS Keychain (service: "CortexAlgo")
  - `cloud_bot_id`, `cloud_access_token`, `cloud_refresh_token`
- **TopstepX credentials**: Encrypted file
  - Path: `~/Library/Application Support/cortexalgo-desktop/topstepx_credentials.enc`
  - Format: `{username, apiKey}` encrypted with OS-level encryption

### Reset Credentials (Testing)
```bash
# Delete encrypted credentials file
rm -rf ~/Library/Application\ Support/cortexalgo-desktop/

# Delete cloud tokens from macOS Keychain
security delete-generic-password -s "CortexAlgo" -a "cloud_bot_id"
security delete-generic-password -s "CortexAlgo" -a "cloud_access_token"
security delete-generic-password -s "CortexAlgo" -a "cloud_refresh_token"
```

## System Tray

The app runs in the system tray with state-based icons:
- **Green**: Connected (everything working)
- **Blue**: Connecting (initial state)
- **Yellow**: Warning/Disconnected (temporary, auto-recovering)
- **Red**: Deactivated/Critical (requires user action)

Tray menu:
- **Show Dashboard**: Opens the main window
- **Quit**: Exits the application

## Configuration

Environment variables (optional):
- `ADMIN_API_URL` - Cloud API endpoint (default: `https://api.cortexalgo.com`)
- `ADMIN_WS_URL` - Cloud WebSocket endpoint (default: `https://api.cortexalgo.com`)

All other configuration is in `config.js`.

## Auto-Updates

The app checks for updates every 10 minutes via GitHub Releases:
- Updates are downloaded in the background
- User is prompted before installation
- Seamless update experience with no data loss

## Project Structure

```
cortexalgo-desktop/
├── main.js                     # Electron main process (background engine)
├── preload.js                  # IPC security bridge
├── package.json                # Dependencies and build config
├── config.js                   # Application configuration
├── services/                   # Backend services (Main Process only)
│   ├── topstepClient.js        # TopstepX orchestrator
│   ├── authService.js          # Authentication & token refresh
│   ├── signalRService.js       # User Hub WebSocket
│   ├── accountManager.js       # Multi-account state & kill switch
│   ├── cloudApiService.js      # CortexAlgo Cloud API
│   ├── updateManager.js        # Auto-update system
│   └── securityService.js      # Device fingerprint & request signing
├── dev/                        # Development-only files
│   ├── mockAccountsService.js  # Mock trading data generator
│   ├── config.js               # Development environment settings
│   └── README.md               # Development setup documentation
├── assets/                     # Application icons
│   ├── icon.png                # 512x512 window icon
│   ├── tray-icon.png           # Default tray icon
│   ├── tray-icon-green.png     # Connected state
│   ├── tray-icon-blue.png      # Connecting state
│   ├── tray-icon-yellow.png    # Warning/Disconnected state
│   └── tray-icon-red.png       # Deactivated/Critical state
├── public/
│   ├── index.html              # Main dashboard HTML shell
│   ├── activation.html         # Activation token window
│   └── api-key.html            # TopstepX credentials window
└── src/
    ├── App.js                  # Main React component (dashboard UI)
    ├── App.css                 # Dashboard styling with theme support
    └── components/             # React components
        ├── AccountDetailView.js # Individual account management interface
        └── AccountDetailView.css # Account detail styling
```

## Development Notes

- React is loaded via CDN with Babel standalone (no bundler for simplicity)
- For production, consider webpack/vite for optimized builds
- All services use CommonJS (`require`/`module.exports`)
- Context isolation enabled in BrowserWindow (security best practice)
- Node integration disabled in renderer (prevents direct Node.js access)

## License

ISC
