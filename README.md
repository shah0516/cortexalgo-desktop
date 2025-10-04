# CortexAlgo Desktop

Desktop application for the Cloud-Hybrid automated trading platform. CortexAlgo acts as the secure execution agent - the local component that receives trade directives from the cloud engine and executes them via trading APIs.

## Features

- **Background Operation**: Runs silently in the system tray
- **Real-time Dashboard**: Native desktop window showing live PNL and trade directives
- **Secure IPC Bridge**: Isolated communication between main process and UI
- **Mock Cloud Engine**: Built-in simulator for development and testing

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

```bash
npm install
```

## Development

Start the application in development mode:

```bash
npm start
```

This will:
1. Launch the Electron application
2. Start the mock cloud engine (simulates real-time data)
3. Open the dashboard window

## Project Structure

```
execution-agent-desktop/
├── main.js              # Electron main process (background engine)
├── preload.js           # Secure IPC bridge
├── package.json         # Dependencies and scripts
├── assets/              # Application icons
├── public/
│   └── index.html       # HTML shell for React app
└── src/
    ├── index.js         # React entry point
    ├── App.js           # Main dashboard component
    └── App.css          # Dashboard styles
```

## How It Works

### Main Process (main.js)
- Creates the application window and system tray
- Runs the mock cloud engine that simulates:
  - PNL updates every 2 seconds
  - Trade directives every 6 seconds
- Sends data to the UI via IPC

### Preload Script (preload.js)
- Provides secure bridge between main process and renderer
- Exposes `window.electronAPI` to React app

### Renderer Process (React UI)
- Listens for events from main process
- Displays real-time PNL and trade directives
- Updates dashboard in real-time

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

## System Tray

The app runs in the system tray with these options:
- **Show Dashboard**: Opens the main window
- **Quit**: Exits the application

## Next Steps

This is a walking skeleton. Future enhancements:
- Replace mock cloud engine with real WebSocket connection
- Integrate actual trading API (e.g., Interactive Brokers, TD Ameritrade)
- Add authentication and secure credential storage
- Implement auto-updates using electron-updater
- Add logging and error handling
- Create settings panel for configuration

## Development Notes

- React is loaded directly without a bundler for simplicity
- For production, consider adding webpack/vite for optimized builds
- Icons are located in `assets/` - replace with production icons
- Mock data generation is in `main.js` `startMockCloudFeed()`
