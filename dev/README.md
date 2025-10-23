# Development Files

This folder contains development-specific files and configurations that are used during local development and testing.

## Files

### `mockAccountsService.js`
- Mock account data generator for development
- Creates realistic trading account scenarios
- Simulates live updates and fills
- Used when no real TopstepX credentials are available

### `config.js`
- Development environment configuration
- Contains development mode detection utilities
- Mock data settings and intervals
- Debug configuration options

## Usage

These files are automatically loaded when the application detects development mode:

1. **NODE_ENV=development** - Environment variable set to development
2. **--dev** - Command line flag passed to the application
3. **Unpackaged app** - Running from source code (not built/packaged)

## Production Note

These files are not used in production builds. The application will fall back to real TopstepX API services when proper credentials are provided.