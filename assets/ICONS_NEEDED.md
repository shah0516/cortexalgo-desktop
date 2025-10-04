# System Tray Icon States

The application requires 4 different colored versions of the tray icon (32x32px) to represent different states:

## Required Icons

### 1. `tray-icon-green.png` (32x32px)
- **State**: Connected and operating normally
- **Color**: Solid green (#30d158 or similar)
- **Usage**: Default active state when bot is running

### 2. `tray-icon-blue.png` (32x32px)
- **State**: Connecting or reconnecting
- **Color**: Blue (#0a84ff or similar)
- **Usage**: Transitional state during connection attempts

### 3. `tray-icon-red.png` (32x32px)
- **State**: Deactivated or subscription inactive
- **Color**: Red (#ff453a or similar)
- **Usage**: Error state requiring user attention

### 4. `tray-icon-yellow.png` (32x32px)
- **State**: Action required (e.g., invalid API key)
- **Color**: Yellow/Orange (#ff9f0a or similar)
- **Usage**: Warning state

## Temporary Development Solution

For now, the app will use `tray-icon.png` for all states until colored versions are created.

## How to Create

You can:
1. Use the existing `algotrading-brain-icon.svg` as a base
2. Export 4 versions at 32x32px with different colors
3. Save them in this `assets/` folder with the names above

## File Locations

```
assets/
├── tray-icon.png          # Original (can be backup)
├── tray-icon-green.png    # Connected
├── tray-icon-blue.png     # Connecting
├── tray-icon-red.png      # Deactivated
└── tray-icon-yellow.png   # Warning
```
