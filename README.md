# Price to Hours Converter - Chrome Extension

A Chrome extension that converts item prices on shopping websites into hours of work required based on your hourly wage.

## Features

- Store and manage your hourly wage
- Automatically detect prices on shopping websites
- Convert prices to hours of work needed
- Works on dynamically loaded content

## Project Structure

```
claude-builder-club/
├── manifest.json              # Extension manifest (Manifest V3)
├── background/
│   └── service-worker.js      # Background service worker
├── content/
│   └── content-script.js      # Content script for price detection & conversion
├── scripts/
│   ├── storage.js             # Storage utilities for hourly wage
│   ├── price-detector.js      # Price detection logic
│   └── converter.js           # Price-to-hours conversion logic
├── utils/
│   └── shopping-sites.js      # Shopping site detection patterns
└── README.md                  # This file
```

## Setup Instructions

1. **Load the extension in Chrome:**

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `claude-builder-club` directory

2. **Set your hourly wage:**

   - The extension will need a UI (to be implemented) to set the hourly wage
   - For now, you can set it programmatically via the browser console or wait for the UI implementation

3. **Browse shopping sites:**
   - Visit any shopping website (Amazon, eBay, etc.)
   - The extension will automatically detect prices and convert them to hours
   - UI for displaying the conversions will be implemented later

## Development Notes

- The extension uses Manifest V3
- Price detection works on common shopping sites
- The extension handles dynamically loaded content via MutationObserver
- All price data is stored with DOM elements using data attributes for future UI injection

## Next Steps

- Implement popup UI for setting hourly wage
- Implement UI for displaying hours alongside prices on shopping sites
- Add more shopping site patterns for better detection
- Add currency support for international sites
